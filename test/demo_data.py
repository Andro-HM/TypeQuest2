"""Optional synthetic demonstration data. Run from the root: python -m test.demo_data."""

from contextlib import closing
from datetime import datetime, timedelta

from database import get_connection
from test.seed import seed_database


# name, best Classic stars per level, typical speed, Time Attack bests, Survival best seconds
# Time Attack bests are ordered: 30 seconds, 1 minute, 2 minutes, 5 minutes.
DEMO_PLAYERS = [
    ("anish", [3] * 20, 61, [72, 67, 60, 54], 195),
    ("akash", [2, 3, 2, 1] * 3 + [2, 3], 57, [84, 71, 63, 49], 148),
    ("smriti", [3, 3, 3, 2] * 5, 65, [79, 76, 70, 66], 285),
    ("isha", [1, 2, 3, 2, 1] * 2, 53, [66, 69, 73, 62], 238),
    ("rajiv", [1, 1, 2, 1, 2, 1], 36, [43, 40, 37, 32], 95),
    ("ravi", [2, 2, 3, 2, 3, 2] * 3, 59, [74, 72, 68, 69], 332),
    ("rakesh", [1, 2, 1], 28, [34, 32, 29, 25], 54),
]


def seed_demo_data(database_path=None):
    seed_database(database_path)
    added = {"profiles": 0, "classic": 0, "time_attack": 0, "survival": 0}
    # Fixed dates identify these sample sessions and make repeat runs skip them.
    start = datetime(2026, 11, 4, 9)

    with closing(get_connection(database_path)) as connection:
        with connection:
            for player_index, (name, best_stars, speed, timed_bests, survival_best) in enumerate(DEMO_PLAYERS):
                cursor = connection.execute(
                    """INSERT INTO profiles (name, created_at)
                       SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE name = ?)""",
                    (name, start.strftime("%Y-%m-%d %H:%M:%S"), name),
                )
                added["profiles"] += cursor.rowcount
                profile_id = connection.execute("SELECT id FROM profiles WHERE name = ?", (name,)).fetchone()["id"]

                # Two attempts per completed level: an earlier attempt and an improved result.
                for attempt in range(2):
                    for index, best in enumerate(best_stars):
                        level_id = index + 1
                        stars = max(1, best - 1) if attempt == 0 else best
                        accuracy = {1: 0.82 + index % 8 * 0.01,
                                    2: 0.90 + index % 4 * 0.01,
                                    3: 0.95 + index % 5 * 0.01}[stars]
                        if attempt == 1 and name == "anish" and level_id == 20:
                            accuracy = 1.0
                        content = connection.execute("SELECT content FROM classic_levels WHERE id = ?", (level_id,)).fetchone()["content"]
                        target_wpm = speed + index % 5 - 2 - (7 if attempt == 0 else 0)
                        elapsed_ms = round(len(content) / 5 / target_wpm * accuracy * 60000)
                        net_wpm = len(content) / 5 / (elapsed_ms / 60000) * accuracy
                        played_at = (start + timedelta(days=attempt * 3 + index // 10, minutes=player_index * 11 + index * 7)).strftime("%Y-%m-%d %H:%M:%S")
                        cursor = connection.execute(
                            """INSERT INTO classic_progress
                               (profile_id, level_id, net_wpm, accuracy, stars, elapsed_ms, played_at)
                               SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
                               (SELECT 1 FROM classic_progress WHERE profile_id = ? AND level_id = ? AND played_at = ?)""",
                            (profile_id, level_id, net_wpm, accuracy, stars, elapsed_ms, played_at,
                             profile_id, level_id, played_at),
                        )
                        added["classic"] += cursor.rowcount

                # Eight timed runs: every duration once, followed by a faster attempt at each.
                for attempt in range(2):
                    for index, duration in enumerate([30, 60, 120, 300]):
                        accuracy = (0.91 if attempt == 0 else 0.96) + (player_index % 3) * 0.01
                        target_wpm = timed_bests[index] - (8 if attempt == 0 else 0)
                        typed_count = round(target_wpm * 5 * duration / 60 / accuracy)
                        correct_count = round(typed_count * accuracy)
                        accuracy = correct_count / typed_count
                        net_wpm = correct_count / 5 / (duration / 60)
                        played_at = (start + timedelta(days=1 + attempt * 3, hours=2, minutes=player_index * 11 + index * 13)).strftime("%Y-%m-%d %H:%M:%S")
                        cursor = connection.execute(
                            """INSERT INTO time_attack_progress
                               (profile_id, duration, net_wpm, accuracy, elapsed_ms, played_at)
                               SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
                               (SELECT 1 FROM time_attack_progress WHERE profile_id = ? AND duration = ? AND played_at = ?)""",
                            (profile_id, duration, net_wpm, accuracy, duration * 1000, played_at,
                             profile_id, duration, played_at),
                        )
                        added["time_attack"] += cursor.rowcount

                # Six Survival attempts include improvement and an occasional shorter run.
                for index, fraction in enumerate([0.42, 0.60, 0.76, 0.89, 0.83, 1.0]):
                    elapsed_ms = round(survival_best * fraction * 1000)
                    tier = min(5, elapsed_ms // 60000 + 1)
                    # Keep sample speeds consistent with the timer-controlled passage.
                    seconds = elapsed_ms / 1000
                    accelerating = min(seconds, 300)
                    distance = 1.5 * accelerating + accelerating ** 2 / 240 + 4 * max(0, seconds - 300)
                    missed = index % 3 + player_index % 2
                    typed_count = int(distance) + 12 - missed
                    correct_count = round(typed_count * (0.84 + index * 0.02 + (player_index % 3) * 0.01))
                    accuracy = correct_count / (typed_count + missed)
                    net_wpm = typed_count / 5 / (elapsed_ms / 60000) * accuracy
                    played_at = (start + timedelta(days=1 + index, hours=4, minutes=player_index * 11)).strftime("%Y-%m-%d %H:%M:%S")
                    cursor = connection.execute(
                        """INSERT INTO survival_progress
                           (profile_id, net_wpm, accuracy, elapsed_ms, tier, played_at)
                           SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
                           (SELECT 1 FROM survival_progress WHERE profile_id = ? AND played_at = ?)""",
                        (profile_id, net_wpm, accuracy, elapsed_ms, tier, played_at, profile_id, played_at),
                    )
                    added["survival"] += cursor.rowcount
    return added


if __name__ == "__main__":
    print("Synthetic demo records added:", seed_demo_data())
