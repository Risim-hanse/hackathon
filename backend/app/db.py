import sqlite3
from contextlib import contextmanager

from .settings import DATABASE_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dose_events (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dose_events_profile
    ON dose_events(profile_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_profile
    ON prescriptions(profile_id);
"""


def init_db() -> None:
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.executescript(SCHEMA)


@contextmanager
def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()
