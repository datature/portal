"""A service to deal with errors and exceptions"""
import logging
from enum import Enum

from flask import jsonify


class Errors(Enum):
    """Enum class containing all errors.

    Errors have values represented by a tuple of (error code, HTTP return status).
    """

    # UNIMPLEMENTED/UNCAUGHT ERRORS = 9XXX
    UNKNOWN = 9999, 500
    FAILEDCAUGHTRESPONSE = 9998, 500

    # ATOMIC ERROR 1XXX
    ATOMICERROR = 1000, 400

    # MODEL ERRORS 2XXX
    UNINITIALIZED = 2000, 412
    FAILEDPREDICTION = 2001, 500
    INVALIDMODELKEY = 2002, 404
    OVERLOADED = 2003, 406
    HUBERROR = 2004, 400

    # PATHING ERRORS 3XXX
    NOFILEPATH = 3000, 404
    INVALIDFILEPATH = 3001, 406
    INVALIDFILETYPE = 3002, 406
    NOTFOUND = 3003, 404

    # API ERRORS 4XXX
    NOAPIBODY = 4000, 404
    INVALIDAPI = 4001, 406
    INVALIDTYPE = 4002, 406
    INVALIDQUERY = 4003, 406

    # PREDICTION ERRORS 5XXX
    STOPPEDPROCESS = 5000, 400

    # ENDPOINT ERRORS 6XXX
    ENDPOINTFAILED = 6000, 500


# pylint: disable=too-few-public-methods
class PortalError(Exception):
    """Error class to handle the errors and exceptions thrown."""

    # pylint: disable=super-init-not-called
    def __init__(
        self, error: Errors, message: str, fail_location: str = None
    ) -> None:
        """Initialize the PortalError class.

        :param error: An enum member of the Errors class.
        :param message: The error message.
        :param fail_location: The fail location.
            Only fill this param in the portal function handler decorator.
        """
        self._error_ = error.name
        self._fail_location_ = fail_location
        self._message_ = message
        self._status_ = error.value[1]
        self._error_code_ = error.value[0]

    def set_fail_location(self, location: str) -> None:
        """Set the fail location"""
        self._fail_location_ = location

    def get_error(self) -> str:
        """Get the error name."""
        return self._error_

    def output(self) -> tuple:
        """Jsonify the output of the PortalError.

        :return: flask jsonify response
        """
        logging.error(self._error_)
        return (
            jsonify(
                {
                    "error": self._error_,
                    "fail_location": self._fail_location_,
                    "message": self._message_,
                    "error_code": self._error_code_,
                }
            ),
            self._status_,
        )
