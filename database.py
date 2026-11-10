import sqlite3


# Keep the database beside this file, regardless of the terminal folder.
DATABASE_PATH = __file__.replace("\\", "/").rsplit("/", 1)[0] + "/typequest.db"


def get_connection(database_path=None):
    if database_path is None:
        database_path = DATABASE_PATH

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_tiers():
    connection = get_connection()

    result = connection.execute("SELECT * FROM classic_tiers ORDER BY id").fetchall()
    connection.close()
    return result


def get_levels(tier):
    connection = get_connection()

    result = connection.execute(
        "SELECT * FROM classic_levels WHERE tier = ? ORDER BY id", (tier,)
    ).fetchall()
    connection.close()
    return result


def get_level(number):
    connection = get_connection()

    result = connection.execute(
        """SELECT classic_levels.id AS number, tier, title, content
           FROM classic_levels
           JOIN classic_tiers ON classic_tiers.id = classic_levels.tier
           WHERE classic_levels.id = ? AND classic_tiers.available = 1""",
        (number,),
    ).fetchone()
    connection.close()
    return result


def get_passages(mode):
    connection = get_connection()

    result = connection.execute(
        "SELECT tier, content FROM typing_passages WHERE mode = ? ORDER BY id",
        (mode,),
    ).fetchall()
    connection.close()
    return result


def get_profiles():
    connection = get_connection()
    result = connection.execute("SELECT * FROM profiles ORDER BY id").fetchall()
    connection.close()
    return result


def get_profile(profile_id):
    connection = get_connection()
    result = connection.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    connection.close()
    return result


def create_profile(name):
    connection = get_connection()
    try:
        cursor = connection.execute("INSERT INTO profiles (name) VALUES (?)", (name,))
        connection.commit()
        return cursor.lastrowid
    finally:
        connection.close()


def rename_profile(profile_id, name):
    connection = get_connection()
    try:
        connection.execute("UPDATE profiles SET name = ? WHERE id = ?", (name, profile_id))
        connection.commit()
    finally:
        connection.close()


def delete_profile(profile_id):
    connection = get_connection()
    try:
        connection.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        connection.commit()
    finally:
        connection.close()


def save_result(mode, profile_id, net_wpm, accuracy, elapsed_ms, stars=1, level_id=None, duration=None, tier=1):
    connection = get_connection()
    try:
        if mode == "classic":
            connection.execute(
                """INSERT INTO classic_progress
                   (profile_id, level_id, net_wpm, accuracy, stars, elapsed_ms)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (profile_id, level_id, net_wpm, accuracy, stars, elapsed_ms),
            )
        elif mode == "time_attack":
            connection.execute(
                """INSERT INTO time_attack_progress
                   (profile_id, duration, net_wpm, accuracy, elapsed_ms)
                   VALUES (?, ?, ?, ?, ?)""",
                (profile_id, duration, net_wpm, accuracy, elapsed_ms),
            )
        else:
            connection.execute(
                """INSERT INTO survival_progress
                   (profile_id, net_wpm, accuracy, elapsed_ms, tier)
                   VALUES (?, ?, ?, ?, ?)""",
                (profile_id, net_wpm, accuracy, elapsed_ms, tier),
            )
        connection.commit()
    finally:
        connection.close()


def get_classic_bests(profile_id):
    connection = get_connection()
    result = connection.execute(
        """SELECT level_id, MAX(stars) AS stars, MAX(net_wpm) AS net_wpm
           FROM classic_progress WHERE profile_id = ? GROUP BY level_id""", (profile_id,)
    ).fetchall()
    connection.close()
    return result


def get_progress(profile_id, mode):
    connection = get_connection()
    if mode == "classic":
        summary = connection.execute(
            """SELECT COUNT(*) AS completed, COALESCE(SUM(stars), 0) AS stars,
                      COALESCE(MAX(net_wpm), 0) AS net_wpm
               FROM (SELECT MAX(stars) AS stars, MAX(net_wpm) AS net_wpm
                     FROM classic_progress WHERE profile_id = ? GROUP BY level_id)""", (profile_id,)
        ).fetchone()
        recent = connection.execute(
            "SELECT * FROM classic_progress WHERE profile_id = ? ORDER BY id DESC LIMIT 5", (profile_id,)
        ).fetchall()
    elif mode == "time_attack":
        summary = connection.execute(
            """SELECT COUNT(*) AS runs, COALESCE(MAX(net_wpm), 0) AS net_wpm,
                      COALESCE(MAX(accuracy), 0) AS accuracy
               FROM time_attack_progress WHERE profile_id = ?""", (profile_id,)
        ).fetchone()
        recent = connection.execute(
            "SELECT * FROM time_attack_progress WHERE profile_id = ? ORDER BY id DESC LIMIT 5", (profile_id,)
        ).fetchall()
    else:
        summary = connection.execute(
            """SELECT COUNT(*) AS runs, COALESCE(MAX(elapsed_ms), 0) AS elapsed_ms,
                      COALESCE(MAX(net_wpm), 0) AS net_wpm
               FROM survival_progress WHERE profile_id = ?""", (profile_id,)
        ).fetchone()
        recent = connection.execute(
            "SELECT * FROM survival_progress WHERE profile_id = ? ORDER BY id DESC LIMIT 5", (profile_id,)
        ).fetchall()
    connection.close()
    return summary, recent


def get_leaderboard(mode, duration):
    connection = get_connection()
    if mode == "classic":
        result = connection.execute(
            """SELECT profiles.id, profiles.name, SUM(best.stars) AS score
               FROM profiles JOIN
                   (SELECT profile_id, level_id, MAX(stars) AS stars
                    FROM classic_progress GROUP BY profile_id, level_id) AS best
               ON best.profile_id = profiles.id
               GROUP BY profiles.id ORDER BY score DESC, profiles.id"""
        ).fetchall()
    elif mode == "time_attack":
        result = connection.execute(
            """SELECT profiles.id, profiles.name, MAX(progress.net_wpm) AS score
               FROM profiles JOIN time_attack_progress AS progress ON progress.profile_id = profiles.id
               WHERE duration = ? GROUP BY profiles.id ORDER BY score DESC, profiles.id""", (duration,)
        ).fetchall()
    else:
        result = connection.execute(
            """SELECT profiles.id, profiles.name, MAX(progress.elapsed_ms) AS score
               FROM profiles JOIN survival_progress AS progress ON progress.profile_id = profiles.id
               GROUP BY profiles.id ORDER BY score DESC, profiles.id"""
        ).fetchall()
    connection.close()
    return result
