import json
import re
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import database
from app import app
from seed import seed_database


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "typequest.db"
        self.database_patch = patch.object(database, "DATABASE_PATH", self.path)
        self.database_patch.start()
        seed_database()
        self.client = app.test_client()
        self.fixture = json.loads((Path(__file__).parent / "seed_data.json").read_text(encoding="utf-8"))

    def tearDown(self):
        self.database_patch.stop()
        self.directory.cleanup()

    def test_seed_values_and_exactly_three_tables(self):
        with closing(database.get_connection()) as connection:
            names = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
            self.assertEqual({row[0] for row in names}, {"classic_tiers", "classic_levels", "typing_passages"})
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
        for url in ["/", "/play", "/classic-levels", "/classic?level=1", "/time-attack?duration=60", "/survival"]:
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
