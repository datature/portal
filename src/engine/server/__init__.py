"""Set up the Flask app and import the routes."""
import os
import threading
import time

from flask import Flask
from flask_socketio import SocketIO

# pylint: disable=E0401, E0611
from server.services.global_store import GlobalStore

# Environment constants

os.environ["WERKZEUG_RUN_MAIN"] = "true"
MODEL_LOAD_LIMIT = 1
EPSILON_MULTIPLIER = 0.001
IDLE_MINUTES = 60 * 5
CACHE_OPTION = (
    True if os.environ["USE_CACHE"] == "1"
    else False
)
try:
    DEBUG_MODE = (
        int(os.environ["PORTAL_LOGGING"])
        if "PORTAL_LOGGING" in os.environ
        else None
    )
except ValueError as e:
    raise ValueError(
        "invalid literal for PORTAL_LOGGING variable.\n"
        "Only 1, 2, 3, 4, 5 are accepted."
    ) from e
if DEBUG_MODE is not None:
    # pylint: disable=wrong-import-position
    import logging

    # Logging Levels:
    # CRITICAL = 5
    # ERROR = 4
    # WARNING = 3
    # INFO = 2
    # DEBUG = 1
    try:
        logging.basicConfig(level=DEBUG_MODE * 10)
        logger = logging.getLogger(__name__)
    except ValueError as e:
        raise ValueError(
            "invalid literal for PORTAL_LOGGING variable.\n"
            "Only 1, 2, 3, 4, 5 are accepted."
        ) from e
else:
    logger = None


class ServerThread(threading.Thread):
    """
    This is a server thread that is linked to the flask app.
    """

    # pylint: disable=redefined-outer-name
    def __init__(self, app):
        """Initialise apps with CORS and run it."""

        threading.Thread.__init__(self)
        self.socket = SocketIO(
            app,
            async_mode="threading",
            cors_allowed_origins="*",
            use_debugger=False,
            use_reloader=False,
        )

    def run(self):
        self.socket.run(app, use_debugger=False, use_reloader=False, port=9449)


# pylint: disable=invalid-name
app = Flask(__name__)
server = ServerThread(app)
global_store = GlobalStore(
    MODEL_LOAD_LIMIT, IDLE_MINUTES, caching_system=CACHE_OPTION
)


def wait_for_process() -> None:
    """Wait for the previous atomic function to be completed."""
    while global_store.get_atomic():
        time.sleep(0.1)


# pylint: disable=wrong-import-position
from .routes import routes
