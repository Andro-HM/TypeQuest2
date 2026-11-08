CREATE TABLE IF NOT EXISTS classic_tiers (
    id INTEGER PRIMARY KEY,
    first_level INTEGER NOT NULL,
    last_level INTEGER NOT NULL CHECK (last_level >= first_level),
    available INTEGER NOT NULL CHECK (available IN (0, 1))
);

CREATE TABLE IF NOT EXISTS classic_levels (
    id INTEGER PRIMARY KEY,
    tier INTEGER NOT NULL REFERENCES classic_tiers(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS typing_passages (
    id INTEGER PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('time_attack', 'survival')),
    tier INTEGER,
    content TEXT NOT NULL,
    CHECK ((mode = 'time_attack' AND tier IS NULL)
        OR (mode = 'survival' AND tier BETWEEN 1 AND 5 AND tier IS NOT NULL))
);


CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(name) BETWEEN 1 AND 24 AND name = trim(name)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classic_progress (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES classic_levels(id),
    run_id TEXT NOT NULL UNIQUE,
    net_wpm REAL NOT NULL CHECK (net_wpm >= 0),
    accuracy REAL NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 3),
    elapsed_ms REAL NOT NULL CHECK (elapsed_ms > 0),
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_attack_progress (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL CHECK (duration IN (30, 60, 120, 300)),
    run_id TEXT NOT NULL UNIQUE,
    net_wpm REAL NOT NULL CHECK (net_wpm >= 0),
    accuracy REAL NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
    elapsed_ms REAL NOT NULL CHECK (elapsed_ms > 0),
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survival_progress (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL UNIQUE,
    net_wpm REAL NOT NULL CHECK (net_wpm >= 0),
    accuracy REAL NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
    elapsed_ms REAL NOT NULL CHECK (elapsed_ms > 0),
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
