import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app as backend
import database
from test.demo_data import DEMO_PLAYERS, seed_demo_data
from test.seed import seed_database


class DemoDataTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "demo.db"
        self.database_patch = patch.object(database, "DATABASE_PATH", self.path)
        self.database_patch.start()
        self.profile_patch = patch.object(backend, "active_profile_id", None)
        self.profile_patch.start()

    def tearDown(self):
        self.profile_patch.stop()
        self.database_patch.stop()
        self.directory.cleanup()

    def test_all_seven_profiles_have_progress_and_rankings(self):
        self.assertEqual(seed_demo_data(), {"profiles": 7, "classic": 182, "time_attack": 56, "survival": 42})
        self.assertEqual([p["name"] for p in database.get_profiles()], [p[0] for p in DEMO_PLAYERS])
        client = backend.app.test_client()
        for profile, player in zip(database.get_profiles(), DEMO_PLAYERS):
            name, stars, speed, timed_bests, survival_best = player
            summary, recent = database.get_progress(profile["id"], "classic")
            self.assertEqual((summary["completed"], summary["stars"]), (len(stars), sum(stars)))
            self.assertEqual(len(recent), 5)
            self.assertEqual(database.get_progress(profile["id"], "time_attack")[0]["runs"], 8)
            self.assertEqual(database.get_progress(profile["id"], "survival")[0]["elapsed_ms"], survival_best * 1000)
            client.post("/profiles", data={"action": "switch", "profile_id": profile["id"]})
            for mode in ["classic", "time_attack", "survival"]:
                self.assertEqual(len(database.get_progress(profile["id"], mode)[1]), 5)
                html = client.get("/progress", query_string={"tab": mode}).get_data(as_text=True)
                self.assertIn("Saved for " + name, html)
                self.assertNotIn("No completed", html)
        for mode, duration, winner in [("classic", 60, "anish"), ("time_attack", 30, "akash"),
                                       ("time_attack", 60, "smriti"), ("time_attack", 120, "isha"),
                                       ("time_attack", 300, "ravi"), ("survival", 60, "ravi")]:
            ranking = database.get_leaderboard(mode, duration)
            self.assertEqual(len(ranking), 7)
            self.assertEqual(ranking[0]["name"], winner)
            html = client.get("/progress", query_string={"tab": "leaderboard", "mode": mode, "duration": duration}).get_data(as_text=True)
            for player in DEMO_PLAYERS:
                self.assertIn(player[0], html)

    def test_repeat_preserves_existing_profiles_results_and_content(self):
        seed_database()
        player = database.create_profile("anish")
        other = database.create_profile("Existing player")
        database.save_result("classic", player, 43, 0.91, 60000, 2, level_id=1)
        database.save_result("survival", other, 20, 0.9, 65000, tier=2)
        connection = database.get_connection()
        with connection:
            connection.execute("UPDATE classic_levels SET title = 'Edited title' WHERE id = 1")
        before = dict(connection.execute("SELECT * FROM classic_progress").fetchone())
        connection.close()
        first = seed_demo_data()
        self.assertEqual(first["profiles"], 6)
        self.assertEqual(seed_demo_data(), {"profiles": 0, "classic": 0, "time_attack": 0, "survival": 0})
        self.assertEqual(database.get_profile(player)["name"], "anish")
        self.assertEqual(database.get_progress(other, "survival")[0]["runs"], 1)
        self.assertEqual(database.get_level(1)["title"], "Edited title")
        connection = database.get_connection()
        self.assertEqual(dict(connection.execute("SELECT * FROM classic_progress WHERE id = ?", (before["id"],)).fetchone()), before)
        self.assertEqual(connection.execute("PRAGMA foreign_key_check").fetchall(), [])
        connection.close()

    def test_sample_statistics_match_game_rules(self):
        seed_demo_data()
        connection = database.get_connection()
        for row in connection.execute("SELECT p.*, l.content FROM classic_progress p JOIN classic_levels l ON p.level_id = l.id"):
            expected_stars = 3 if row["accuracy"] >= 0.95 else 2 if row["accuracy"] >= 0.90 else 1
            self.assertEqual(row["stars"], expected_stars)
            self.assertAlmostEqual(row["net_wpm"], len(row["content"]) / 5 / (row["elapsed_ms"] / 60000) * row["accuracy"])
        for row in connection.execute("SELECT * FROM time_attack_progress"):
            self.assertEqual(row["elapsed_ms"], row["duration"] * 1000)
        for row in connection.execute("SELECT * FROM survival_progress"):
            self.assertEqual(row["tier"], min(5, int(row["elapsed_ms"] // 60000) + 1))
            self.assertGreaterEqual(row["accuracy"], 0)
            self.assertLessEqual(row["accuracy"], 1)
        self.assertEqual(connection.execute("SELECT COUNT(*) FROM classic_levels").fetchone()[0], 20)
        self.assertEqual(connection.execute("SELECT available FROM classic_tiers WHERE id = 3").fetchone()[0], 0)
        connection.close()


if __name__ == "__main__":
    unittest.main()
