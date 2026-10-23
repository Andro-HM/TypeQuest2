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
