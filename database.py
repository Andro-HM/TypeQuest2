"""Small SQLite queries used by the Flask pages."""

import sqlite3
from contextlib import closing
from pathlib import Path


DATABASE_PATH = Path(__file__).parent / "typequest.db"


def get_connection(database_path=None):
    if database_path is None:
        database_path = DATABASE_PATH

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_tiers():
    with closing(get_connection()) as connection:
        return connection.execute("SELECT * FROM classic_tiers ORDER BY id").fetchall()


def get_levels(tier):
    with closing(get_connection()) as connection:
        return connection.execute(
            "SELECT * FROM classic_levels WHERE tier = ? ORDER BY id", (tier,)
        ).fetchall()


def get_level(number):
    with closing(get_connection()) as connection:
        return connection.execute(
            """SELECT classic_levels.id AS number, tier, title, content
               FROM classic_levels
               JOIN classic_tiers ON classic_tiers.id = classic_levels.tier
               WHERE classic_levels.id = ? AND classic_tiers.available = 1""",
            (number,),
        ).fetchone()


def get_passages(mode):
    with closing(get_connection()) as connection:
        return connection.execute(
            "SELECT tier, content FROM typing_passages WHERE mode = ? ORDER BY id",
            (mode,),
        ).fetchall()
