import json
import re
import runpy
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import database
import app as backend
from app import app
from test.seed import seed_database


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "typequest.db"
        self.database_patch = patch.object(database, "DATABASE_PATH", self.path)
        self.database_patch.start()
        seed_database()
        self.profile_patch = patch.object(backend, "active_profile_id", None)
        self.profile_patch.start()
        self.client = app.test_client()
        backend.active_profile_id = database.create_profile("Test player")
        self.fixture = json.loads((Path(__file__).parent / "seed_data.json").read_text(encoding="utf-8"))

    def tearDown(self):
        self.profile_patch.stop()
        self.database_patch.stop()
        self.directory.cleanup()

    def test_seed_values_and_exactly_seven_tables(self):
        with closing(database.get_connection()) as connection:
            names = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").fetchall()
            self.assertEqual({row[0] for row in names}, {"classic_tiers", "classic_levels", "typing_passages", "profiles", "classic_progress", "time_attack_progress", "survival_progress"})
            for table, key in [("classic_tiers", "tiers"), ("classic_levels", "levels"), ("typing_passages", "passages")]:
                rows = connection.execute("SELECT * FROM " + table + " ORDER BY id").fetchall()
                self.assertEqual([dict(row) for row in rows], self.fixture[key])
            self.assertEqual(connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
            with self.assertRaises(sqlite3.IntegrityError):
                connection.execute("INSERT INTO classic_levels VALUES (?, ?, ?, ?)", (99, 99, "Invalid", "Invalid"))

    def test_repeat_seed_keeps_edits_and_counts(self):
        first = seed_database()
        with closing(database.get_connection()) as connection:
            with connection:
                connection.execute("UPDATE classic_levels SET title = ? WHERE id = ?", ("Edited title", 1))
        self.assertEqual(seed_database(), first)
        self.assertEqual(database.get_level(1)["title"], "Edited title")
        self.assertEqual(first, {"classic_tiers": 5, "classic_levels": 20, "time_attack": 100, "survival": 100})

    def test_all_routes_and_local_assets(self):
        for url in ["/", "/home", "/play", "/classic-levels", "/classic?level=1", "/time-attack?duration=60", "/survival", "/profiles", "/progress", "/settings", "/progress?tab=leaderboard&mode=survival"]:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                html = response.get_data(as_text=True)
                self.assertNotIn("-data.js", html)
                for target in re.findall(r'(?:href|src|action)="([^"]+)"', html):
                    if target.startswith("/"):
                        with self.client.get(target.replace("&amp;", "&")) as asset:
                            self.assertEqual(asset.status_code, 200, target)

    def test_classic_levels_and_invalid_selection(self):
        self.assertIsNone(database.get_level(21))
        for value in ["abc", "0", "-1", "21", "999", "1 OR 1=1"]:
            response = self.client.get("/classic", query_string={"level": value})
            self.assertEqual(response.status_code, 404)
            self.assertIn("Level unavailable", response.get_data(as_text=True))
        for level in self.fixture["levels"]:
            self.assertEqual(self.client.get("/classic", query_string={"level": level["id"]}).status_code, 200)
        html = self.client.get("/classic-levels?tier=2").get_data(as_text=True)
        self.assertEqual(html.count('class="level-card"'), 10)
        self.assertIn('/classic?level=11', html)
        self.assertIn('id="tier-3"', html)
        for value in ["abc", "3", "99"]:
            html = self.client.get("/classic-levels", query_string={"tier": value}).get_data(as_text=True)
            self.assertIn('id="tier-title">Tier 1', html)

    def test_duration_defaults_and_choices(self):
        for value in [30, 60, 120, 300, "abc", -1, 999, ""]:
            expected = value if value in (30, 60, 120, 300) else 60
            html = self.client.get("/time-attack", query_string={"duration": value}).get_data(as_text=True)
            self.assertIn("const durationSeconds = " + str(expected) + ";", html)
        self.assertIn("const durationSeconds = 60;", self.client.get("/time-attack").get_data(as_text=True))

    @patch.multiple(backend, game_volume=50, tap_volume=70, background_music_volume=60)
    def test_settings_defaults_and_controls_without_profile(self):
        backend.active_profile_id = None
        response = self.client.get("/settings")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        sliders = re.findall(r'<input[^>]+type="range"[^>]*>', html)
        self.assertEqual(len(sliders), 3)
        for slider, name, value in zip(sliders, ["game_volume", "tap_volume", "background_music_volume"], [50, 70, 60]):
            self.assertIn('name="' + name + '"', slider)
            self.assertIn('min="0" max="100"', slider)
            self.assertIn('value="' + str(value) + '"', slider)
        self.assertIn('href="/settings" class="nav-link nav-link-active"', html)
        self.assertIn('id="profile-name">Choose profile', html)
        self.assertNotIn('<button', html)
        self.assertNotIn('<audio', html)
        self.assertNotIn('Set-Cookie', response.headers)

    @patch.multiple(backend, game_volume=50, tap_volume=70, background_music_volume=60)
    def test_settings_posts_and_later_visits(self):
        response = self.client.post("/settings", data={"game_volume": 0})
        self.assertEqual(response.json, {"saved": True})
        self.assertEqual((backend.game_volume, backend.tap_volume, backend.background_music_volume), (0, 70, 60))
        response = self.client.post("/settings", data={"tap_volume": 100})
        self.assertEqual(response.status_code, 200)
        self.client.post("/settings", data={"background_music_volume": 37})
        self.assertEqual((backend.game_volume, backend.tap_volume, backend.background_music_volume), (0, 100, 37))
        self.client.get("/")
        html = self.client.get("/settings").get_data(as_text=True)
        self.assertIn('value="0" style="--volume: 0%;"', html)
        self.assertIn('value="100" style="--volume: 100%;"', html)
        self.assertIn('value="37" style="--volume: 37%;"', html)
        self.client.post("/settings", data={"game_volume": 100, "tap_volume": 0, "background_music_volume": 0})
        self.assertEqual((backend.game_volume, backend.tap_volume, backend.background_music_volume), (100, 0, 0))

    @patch.multiple(backend, game_volume=50, tap_volume=70, background_music_volume=60)
    def test_settings_are_global_and_navigation_links_work(self):
        self.client.post("/settings", data={"game_volume": 23, "tap_volume": 41, "background_music_volume": 82})
        first = backend.active_profile_id
        self.client.post("/profiles", data={"action": "create", "name": "Another player"})
        second = backend.active_profile_id
        self.client.post("/profiles", data={"action": "switch", "profile_id": first})
        for url in ["/home", "/play", "/classic-levels", "/profiles", "/progress", "/settings"]:
            html = self.client.get(url).get_data(as_text=True)
            self.assertIn('href="/settings"', html)
            self.assertNotIn('href="#settings"', html)
        self.client.post("/profiles", data={"action": "delete", "profile_id": second})
        html = self.client.get("/settings").get_data(as_text=True)
        self.assertIn('id="profile-name">Test player', html)
        self.client.post("/profiles", data={"action": "delete", "profile_id": first})
        self.assertEqual(self.client.get("/settings").status_code, 200)
        self.assertEqual((backend.game_volume, backend.tap_volume, backend.background_music_volume), (23, 41, 82))

    @patch.multiple(backend, game_volume=23, tap_volume=41, background_music_volume=82)
    def test_shared_audio_configuration_only_in_outer_page(self):
        urls = ["/home", "/play", "/classic-levels", "/classic?level=1", "/time-attack",
                "/survival", "/profiles", "/progress", "/settings", "/classic?level=999"]
        for url in urls:
            html = self.client.get(url).get_data(as_text=True)
            self.assertNotIn('src="/static/js/audio.js"', html, url)
            self.assertNotIn("const audioSettings", html, url)
            self.assertNotIn("/static/audio/background_music.wav", html)
        html = self.client.get("/").get_data(as_text=True)
        self.assertEqual(html.count('src="/static/js/audio.js"'), 1)
        settings = json.loads(re.search(r"const audioSettings =\s*(\{.*?\});", html, re.S).group(1))
        self.assertEqual(settings, {"game_volume": 23, "tap_volume": 41})
        files = json.loads(re.search(r"const audioFiles =\s*(\{.*?\});", html, re.S).group(1))
        self.assertEqual(set(files), {"ui_tap", "correct_key", "wrong_key"})
        for name, url in files.items():
            with self.client.get(url) as response:
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data[:4], b"RIFF")
                self.assertEqual(response.data[8:12], b"WAVE")
        with self.client.get("/static/js/audio.js") as response:
            self.assertEqual(response.status_code, 200)

    def test_server_startup_selects_first_profile_without_python_audio(self):
        first = backend.active_profile_id
        backend.active_profile_id = database.create_profile("Another player")
        for expected in (first, None):
            if expected is None:
                for profile in database.get_profiles():
                    database.delete_profile(profile["id"])
            with patch("flask.Flask.run") as run:
                state = runpy.run_path(str(Path(__file__).parents[1] / "app.py"), run_name="__main__")
                self.assertEqual(state["active_profile_id"], expected)
                self.assertNotIn("pygame", state)
                run.assert_called_once_with(debug=True, use_reloader=False)

    def test_import_does_not_start_server_or_python_audio(self):
        with patch("flask.Flask.run") as run:
            state = runpy.run_path(str(Path(__file__).parents[1] / "app.py"), run_name="typequest_import_test")
            run.assert_not_called()
            self.assertNotIn("pygame", state)
        self.assertNotIn("pygame", (Path(__file__).parents[1] / "requirements.txt").read_text())

    @patch.multiple(backend, game_volume=50, tap_volume=70, background_music_volume=60)
    def test_background_volume_updates_python_value_for_outer_page(self):
        for percentage in (0, 23, 100):
            response = self.client.post("/settings", data={"background_music_volume": percentage})
            self.assertEqual(response.json, {"saved": True})
            self.assertEqual(backend.background_music_volume, percentage)
            outer = self.client.get("/").get_data(as_text=True)
            self.assertIn("const initialMusicVolume = " + str(percentage) + ";", outer)

    @patch.object(backend, "background_music_volume", 82)
    def test_outer_page_contains_one_fullscreen_frame_and_shared_audio(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertEqual(html.count("<iframe "), 1)
        self.assertIn('id="app-frame" src="/home"', html)
        self.assertIn('allow="autoplay"', html)
        self.assertIn("border: 0;", html)
        self.assertIn("const initialMusicVolume = 82;", html)
        self.assertEqual(html.count('src="/static/js/background-music.js"'), 1)
        self.assertEqual(html.count('src="/static/js/audio.js"'), 1)
        self.assertNotIn("Set-Cookie", response.headers)
        home = self.client.get("/home").get_data(as_text=True)
        self.assertIn('href="/home"', home)
        self.assertNotIn('target="_top"', home)
        with self.client.get("/static/js/background-music.js") as asset:
            self.assertEqual(asset.status_code, 200)
        with self.client.get("/static/audio/background_music.wav") as asset:
            self.assertEqual(asset.data[:4], b"RIFF")

    def test_requests_use_database_and_escape_script_content(self):
        text = 'Exact spacing  and punctuation: "quotes" </script><script>alert(1)</script>'
        with closing(database.get_connection()) as connection:
            with connection:
                connection.execute("UPDATE classic_levels SET content = ? WHERE id = ?", (text, 1))
                connection.execute("UPDATE typing_passages SET content = ? WHERE id = ?", (text, 1))
        for url in ["/classic?level=1", "/time-attack"]:
            html = self.client.get(url).get_data(as_text=True)
            self.assertNotIn("</script><script>alert(1)</script>", html)
            self.assertIn("\\u003c/script\\u003e", html)
        self.assertEqual(database.get_level(1)["content"], text)


if __name__ == "__main__":
    unittest.main()
