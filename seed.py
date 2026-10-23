"""Create the schema and add missing original seed rows. Existing rows stay unchanged."""

import json
from contextlib import closing
from pathlib import Path

from database import get_connection


def seed_database(database_path=None):
    root = Path(__file__).parent
    data = json.loads((root / "seed_data.json").read_text(encoding="utf-8"))

    with closing(get_connection(database_path)) as connection:
        connection.executescript((root / "schema.sql").read_text(encoding="utf-8"))

        with connection:
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
