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

    try:
        return connection.execute("SELECT * FROM classic_tiers ORDER BY id").fetchall()
    finally:
        connection.close()


def get_levels(tier):
    connection = get_connection()

    try:
        return connection.execute(
            "SELECT * FROM classic_levels WHERE tier = ? ORDER BY id", (tier,)
        ).fetchall()
    finally:
        connection.close()


def get_level(number):
    connection = get_connection()

    try:
        return connection.execute(
            """SELECT classic_levels.id AS number, tier, title, content
               FROM classic_levels
               JOIN classic_tiers ON classic_tiers.id = classic_levels.tier
               WHERE classic_levels.id = ? AND classic_tiers.available = 1""",
            (number,),
        ).fetchone()
    finally:
        connection.close()


def get_passages(mode):
    connection = get_connection()

    try:
        return connection.execute(
            "SELECT tier, content FROM typing_passages WHERE mode = ? ORDER BY id",
            (mode,),
        ).fetchall()
    finally:
        connection.close()
