"""Set up the Flask app and import the routes."""
import atexit
import threading
import time

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask
from flask_cors import CORS
from werkzeug.serving import make_server

# pylint: disable=E0401, E0611
from server.services.global_store import GlobalStore

# Environment constants
MODEL_LOAD_LIMIT = 1
CACHE_OPTION = True
EPSILON_MULTIPLIER = 0.001
IDLE_MINUTES = 60 * 5


class ServerThread(threading.Thread):
    """
    This is a server thread that is linked to the flask app.
    """

    # pylint: disable=redefined-outer-name
    def __init__(self, app):
        """Initialise apps with CORS and run it."""
        CORS(app)
        app.config["CORS_HEADERS"] = "Content-Type"
        threading.Thread.__init__(self)
        self.srv = make_server("127.0.0.1", 5000, app)
        self.ctx = app.app_context()
        self.ctx.push()

    def run(self):
        server_name = app.config.get("SERVER_NAME")
        print(
            f'\t* Running on {server_name if server_name is not None else "127.0.0.1:5000"}'
            f'\n\t* Environment: {app.config.get("ENV")}\n\t* Debug Mode: {app.config.get("DEBUG")}'
            f'\n\t* Testing Mode: {app.config.get("TESTING}")}'
        )
        self.srv.serve_forever()

    def shutdown(self):
        print("Shutting down server")
        self.srv.shutdown()


# pylint: disable=invalid-name
app = Flask(__name__)
server = ServerThread(app)
global_store = GlobalStore(MODEL_LOAD_LIMIT, caching_system=CACHE_OPTION)
scheduler = BackgroundScheduler(daemon=True)


def wait_for_process() -> None:
    """Wait for the previous atomic function to be completed."""
    while global_store.get_atomic():
        time.sleep(0.1)


def shutdown_server() -> None:
    """Shutdown the server."""
    server.shutdown()


def schedule_shutdown():
    """Scheduler Job to check whether there's inactivity within the last 5 minutes

    :return: void
    """
    if (
        global_store.is_shutdown_server(IDLE_MINUTES)
        or global_store.get_atomic()
    ):
        time.sleep(5)
    else:
        shutdown_server()


scheduler.add_job(schedule_shutdown, "interval", minutes=1)
scheduler.start()
# Shut down the scheduler when exiting the app
# pylint: disable=unnecessary-lambda)
atexit.register(lambda: scheduler.shutdown())

# pylint: disable=wrong-import-position
from .routes import routes
