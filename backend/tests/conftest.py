import os
import tempfile

# Must run before importing app.* so settings picks up the test database.
os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(), "meditrack_test.db")

from app.db import init_db  # noqa: E402

init_db()
