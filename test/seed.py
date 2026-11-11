"""Create the schema and add missing original seed rows. Existing rows stay unchanged."""

import json
from contextlib import closing
from pathlib import Path

from database import get_connection


def seed_database(database_path=None):
    root = Path(__file__).parent
    data = json.loads((root / "seed_data.json").read_text(encoding="utf-8"))

    with closing(get_connection(database_path)) as connection:
        with connection:
            connection.execute("BEGIN")
            # Upgrade older databases once, keeping every saved row except its obsolete token.
            old_tables = []
            for table in ("classic_progress", "time_attack_progress", "survival_progress"):
                columns = [row["name"] for row in connection.execute("PRAGMA table_info(" + table + ")")]
                if "run_id" in columns:
                    connection.execute("ALTER TABLE " + table + " RENAME TO " + table + "_old")
                    columns.remove("run_id")
                    old_tables.append((table, columns))

            schema = (root / "schema.sql").read_text(encoding="utf-8")
            for statement in schema.split(";"):
                if statement.strip():
                    connection.execute(statement)

            for table, columns in old_tables:
                names = ", ".join(columns)
                connection.execute("INSERT INTO " + table + " (" + names + ") SELECT " + names + " FROM " + table + "_old")
                connection.execute("DROP TABLE " + table + "_old")

            for tier in data["tiers"]:
                connection.execute(
                    """INSERT INTO classic_tiers (id, first_level, last_level, available)
                       VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING""",
                    (tier["id"], tier["first_level"], tier["last_level"], tier["available"]),
                )

            for level in data["levels"]:
                connection.execute(
                    """INSERT INTO classic_levels (id, tier, title, content)
                       VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING""",
                    (level["id"], level["tier"], level["title"], level["content"]),
                )

            for passage in data["passages"]:
                connection.execute(
                    """INSERT INTO typing_passages (id, mode, tier, content)
                       VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING""",
                    (passage["id"], passage["mode"], passage["tier"], passage["content"]),
                )

        counts = {}
        counts["classic_tiers"] = connection.execute("SELECT COUNT(*) FROM classic_tiers").fetchone()[0]
        counts["classic_levels"] = connection.execute("SELECT COUNT(*) FROM classic_levels").fetchone()[0]
        counts["time_attack"] = connection.execute(
            "SELECT COUNT(*) FROM typing_passages WHERE mode = ?", ("time_attack",)
        ).fetchone()[0]
        counts["survival"] = connection.execute(
            "SELECT COUNT(*) FROM typing_passages WHERE mode = ?", ("survival",)
        ).fetchone()[0]
        return counts


if __name__ == "__main__":
    print("Database ready:", seed_database())
