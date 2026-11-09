import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import database
from app import app
from seed import seed_database


class ProfileProgressTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "test.db"
        self.patch = patch.object(database, "DATABASE_PATH", self.path)
        self.patch.start()
        seed_database()
        self.client = app.test_client()

    def tearDown(self):
        self.patch.stop()
        self.directory.cleanup()

    def create(self, name="HM"):
        self.client.post("/profiles", data={"action": "create", "name": name})
        with self.client.session_transaction() as session:
            return session["profile_id"]

    def test_profile_guard_creation_switch_rename_and_validation(self):
        for url in ["/play", "/classic-levels", "/classic?level=1", "/time-attack", "/survival"]:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 302)
            self.assertIn("/profiles", response.location)
        first = self.create("  HM  ")
        self.assertEqual(database.get_profile(first)["name"], "HM")
        self.client.post("/profiles", data={"action": "create", "name": "hm"})
        self.assertEqual(len(database.get_profiles()), 1)
        for name in ["", "   ", "a" * 25]:
            self.client.post("/profiles", data={"action": "create", "name": name})
        self.assertEqual(len(database.get_profiles()), 1)
        second = self.create("AR")
        self.client.post("/profiles", data={"action": "switch", "profile_id": first})
        self.assertIn("HM", self.client.get("/").get_data(as_text=True))
        self.client.post("/profiles", data={"action": "rename", "profile_id": first, "name": "Alex"})
        self.assertEqual(database.get_profile(first)["name"], "Alex")
        self.client.post("/profiles", data={"action": "rename", "profile_id": first, "name": "AR"})
        self.assertEqual(database.get_profile(first)["name"], "Alex")
        self.assertEqual(len(database.get_profiles()), 2)
        database.delete_profile(second)
        replacement = self.create("New player")
        self.assertGreater(replacement, second)
        self.assertIsNone(database.get_profile(second))

    def test_exact_star_thresholds_and_completion(self):
        profile_id = self.create()
        connection = database.get_connection()
        try:
            with connection:
                connection.execute("UPDATE classic_levels SET content = ? WHERE id = 1", ("a" * 100000,))
        finally:
            connection.close()
        for correct, expected in [(89999, 1), (90000, 2), (94999, 2), (95000, 3), (100000, 3)]:
            payload = {"mode": "classic", "profile_id": profile_id, "level_id": 1, "typed_count": 100000, "correct_count": correct, "elapsed_ms": 60000}
            response = self.client.post("/results", json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["stars"], expected)
        summary, recent = database.get_progress(profile_id, "classic")
        self.assertEqual(len(recent), 5)
        self.assertEqual(summary["completed"], 1)
        self.assertEqual(summary["stars"], 3)
        self.assertEqual(self.client.post("/results", json={"mode": "classic", "profile_id": profile_id, "level_id": 1, "typed_count": 99999, "correct_count": 99999, "elapsed_ms": 1000}).status_code, 400)
        # WPM cannot change stars: use exactly 95% over a much slower run.
        response = self.client.post("/results", json={"mode": "classic", "profile_id": profile_id, "level_id": 1, "typed_count": 100000, "correct_count": 95000, "elapsed_ms": 600000})
        self.assertEqual(response.json["stars"], 3)

    def test_separate_profiles_leaderboards_duration_and_cascade(self):
        hm = self.create("HM")
        ar = self.create("AR")
        database.save_result("classic", hm, 20, 0.89, 60000, 1, 1)
        database.save_result("classic", hm, 30, 0.96, 60000, 3, 1)
        database.save_result("classic", hm, 30, 0.91, 60000, 2, 2)
        database.save_result("classic", ar, 99, 1, 60000, 3, 1)
        self.assertEqual([(r["id"], r["score"]) for r in database.get_leaderboard("classic", 60)], [(hm, 5), (ar, 3)])
        database.save_result("time_attack", hm, 50, 1, 30000, duration=30)
        database.save_result("time_attack", ar, 70, 1, 60000, duration=60)
        self.assertEqual([r["id"] for r in database.get_leaderboard("time_attack", 30)], [hm])
        self.assertEqual([r["id"] for r in database.get_leaderboard("time_attack", 60)], [ar])
        database.save_result("survival", hm, 99, 1, 20000)
        database.save_result("survival", ar, 10, 0.5, 90000, tier=2)
        self.assertEqual([r["id"] for r in database.get_leaderboard("survival", 60)], [ar, hm])
        database.delete_profile(hm)
        for mode in ["classic", "time_attack", "survival"]:
            summary, recent = database.get_progress(hm, mode)
            self.assertEqual(len(recent), 0)
        self.assertIsNotNone(database.get_level(1))
        self.assertEqual(len(database.get_passages("time_attack")), 100)
        self.assertEqual(len(database.get_progress(ar, "classic")[1]), 1)

    def test_active_profile_and_basic_result_validation(self):
        self.assertEqual(self.client.post("/results", json={}).status_code, 401)
        hm = self.create("HM")
        payload = {"mode": "time_attack", "profile_id": hm, "duration": 30,
                   "typed_count": 100, "correct_count": 95, "elapsed_ms": 30000}
        self.create("AR")
        self.assertEqual(self.client.post("/results", json=payload).status_code, 409)
        self.client.post("/profiles", data={"action": "switch", "profile_id": hm})
        self.assertEqual(self.client.post("/results", json=payload).status_code, 200)
        self.assertEqual(len(database.get_progress(hm, "time_attack")[1]), 1)
        # Duplicate completion calls are blocked by JavaScript, not by database identifiers.
        self.assertEqual(self.client.post("/results", json=payload).status_code, 200)
        self.assertEqual(len(database.get_progress(hm, "time_attack")[1]), 2)
        for changes in [{"elapsed_ms": 29999}, {"correct_count": 101}, {"typed_count": -1},
                        {"mode": "unknown"}, {"elapsed_ms": float("nan")}, {"duration": 99}]:
            invalid = dict(payload)
            invalid.update(changes)
            self.assertEqual(self.client.post("/results", json=invalid).status_code, 400)
        self.assertEqual(self.client.post("/results", json=[]).status_code, 400)
        self.assertEqual(self.client.post("/results", data="not JSON").status_code, 400)
        self.client.post("/profiles", data={"action": "delete", "profile_id": hm})
        self.assertEqual(self.client.get("/play").status_code, 302)
        self.assertEqual(self.client.post("/results", json=payload).status_code, 401)
        with self.client.session_transaction() as session:
            self.assertNotIn("runs", session)

    def test_recent_five_ist_and_progress_empty_states(self):
        profile_id = self.create()
        for tab in ["classic", "time_attack", "survival", "leaderboard", "invalid"]:
            self.assertEqual(self.client.get("/progress", query_string={"tab": tab}).status_code, 200)
        for i in range(7):
            database.save_result("survival", profile_id, i, 1, 1000 * (i + 1))
        self.assertEqual([r["net_wpm"] for r in database.get_progress(profile_id, "survival")[1]], [6, 5, 4, 3, 2])
        with app.app_context():
            self.assertEqual(app.jinja_env.filters["ist"]("2026-11-08 20:00:00"), "09 Nov 2026 · 01:30")
        before = len(database.get_profiles())
        seed_database()
        self.assertEqual(len(database.get_profiles()), before)
        self.assertEqual(len(database.get_progress(profile_id, "survival")[1]), 5)

    def test_upgrade_preserves_existing_progress_without_tokens(self):
        profile_id = self.create()
        schema = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
        legacy_schema = schema.replace("    net_wpm REAL NOT NULL", "    run_id TEXT NOT NULL UNIQUE,\n    net_wpm REAL NOT NULL")
        connection = database.get_connection()
        try:
            for table in ("classic_progress", "time_attack_progress", "survival_progress"):
                connection.execute("DROP TABLE " + table)
            connection.executescript(legacy_schema)
            with connection:
                connection.execute("INSERT INTO classic_progress VALUES (7, ?, 1, 'old-c', 50, 0.95, 3, 60000, '2026-11-08 12:00:00')", (profile_id,))
                connection.execute("INSERT INTO time_attack_progress VALUES (8, ?, 30, 'old-t', 60, 0.9, 30000, '2026-11-08 12:00:00')", (profile_id,))
                connection.execute("INSERT INTO survival_progress VALUES (9, ?, 'old-s', 40, 0.8, 90000, 2, '2026-11-08 12:00:00')", (profile_id,))
            expected = {}
            for table in ("classic_progress", "time_attack_progress", "survival_progress"):
                row = dict(connection.execute("SELECT * FROM " + table).fetchone())
                del row["run_id"]
                expected[table] = row
        finally:
            connection.close()

        seed_database()
        seed_database()
        connection = database.get_connection()
        try:
            for table, row in expected.items():
                self.assertEqual(dict(connection.execute("SELECT * FROM " + table).fetchone()), row)
                columns = [column["name"] for column in connection.execute("PRAGMA table_info(" + table + ")")]
                self.assertNotIn("run_id", columns)
            self.assertEqual(connection.execute("PRAGMA foreign_key_check").fetchall(), [])
        finally:
            connection.close()
        database.delete_profile(profile_id)
        for mode in ("classic", "time_attack", "survival"):
            self.assertEqual(database.get_progress(profile_id, mode)[1], [])

    def test_foreign_keys_and_names_are_escaped(self):
        self.create('<script>x</script>')
        html = self.client.get("/profiles").get_data(as_text=True)
        self.assertNotIn('<span class="player-name"><script>', html)
        connection = database.get_connection()
        try:
            self.assertEqual(connection.execute("PRAGMA foreign_key_check").fetchall(), [])
            with self.assertRaises(sqlite3.IntegrityError):
                connection.execute("INSERT INTO survival_progress (profile_id, net_wpm, accuracy, elapsed_ms, tier) VALUES (999, 1, 1, 1, 1)")
        finally:
            connection.close()


if __name__ == "__main__":
    unittest.main()
