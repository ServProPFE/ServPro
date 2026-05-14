import os

from app import app as flask_app

# Vercel Python runtime can serve a Flask WSGI app when exported here.
app = flask_app
handler = flask_app

# Keep Vercel happy if it inspects module-level metadata.
os.environ.setdefault("PYTHONUNBUFFERED", "1")
