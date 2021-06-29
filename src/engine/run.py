"""Main file to run the flask app."""

# Ignore due to Pyshell
# pylint: disable=E0401, E0611
from server import server


def initialize() -> None:
    server.run()


if __name__ == "__main__":
    initialize()
