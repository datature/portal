#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   file.py
@Author  :   Beatrice Leong
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Service to deal with file related functions.
"""
from io import BytesIO

import cv2

# pylint: disable=E0401, E0611
from server.services.errors import Errors, PortalError

ALLOWED_EXTENSIONS_IMAGE = {"png", "jpg", "jpeg"}
ALLOWED_EXTENSIONS_VIDEO = {"mp4", "mov", "wmv", "mkv"}

ALLOWED_EXTENSIONS = set.union(
    ALLOWED_EXTENSIONS_VIDEO,
    ALLOWED_EXTENSIONS_IMAGE,
)


class File:
    """
    File class that will contain path, name and metadata
    Needs to be initialized with:
    - path: path string of the file (encoded)
    - name: name of the file
    - metadata: additional info
    """

    def __init__(self, path, name):
        self._path_ = path
        self._name_ = name
        self._metadata_ = None

    def get_path(self):
        """Obtain the path of the file."""
        return self._path_

    def get_name(self):
        """Obtain the name of the file."""
        return self._name_


def allowed_file(filename):
    """
    Checks if the file is allowed (has to be part of the ALLOWED_EXTENSIONS)
    :param filename: a string that is the name of the file
    :return: boolean (TRUE: Allowed; FALSE: Not Allowed)
    """
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_image(filename):
    """
    Checks if the file is allowed
    (has to be part of the ALLOWED_EXTENSIONS_IMAGE)
    :param filename: a string that is the name of the file
    :return: boolean (TRUE: Allowed; FALSE: Not Allowed)
    """
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS_IMAGE
    )


def allowed_video(filename):
    """
    Checks if the file is allowed
    (has to be part of the ALLOWED_EXTENSIONS_VIDEO)
    :param filename: a string that is the name of the file
    :return: boolean (TRUE: Allowed; FALSE: Not Allowed)
    """
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS_VIDEO
    )


def generate_thumbnail(path, filename):
    """Create small thumbnail to be used by Portal frontend."""
    if not allowed_file(filename):
        raise PortalError(Errors.INVALIDFILETYPE, filename)

    thumb_bytes = None
    if allowed_video(filename):
        threshold = 1
        vcap = cv2.VideoCapture(path)
        width = vcap.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = vcap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        aspect_ratio = width / height
        if width > height:
            height = int(500 / aspect_ratio)
            width = 500
        else:
            height = 500
            width = int(aspect_ratio * 500)

        res, image_ar = vcap.read()
        while image_ar.mean() < threshold and res:
            res, image_ar = vcap.read()
        image_ar = cv2.resize(image_ar, (width, height), 0, 0, cv2.INTER_LINEAR)
        res, image_buf = cv2.imencode(".jpeg", image_ar)
        thumb_bytes = image_buf.tobytes()

    else:
        # Resize image
        image = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        width = image.shape[1]
        height = image.shape[0]
        aspect_ratio = width / height

        dsize = (int(aspect_ratio * 500), 500)
        if width > height:
            dsize = (500, int(500 / aspect_ratio))

        image_resize = cv2.resize(image, dsize)
        # pylint: disable=unused-variable
        is_success, image_buf = cv2.imencode(".jpeg", image_resize)
        thumb_bytes = image_buf.tobytes()

    # Store in bytes buffer
    image_buffer = BytesIO()
    if thumb_bytes:
        image_buffer.write(thumb_bytes)
    image_buffer.seek(0)
    return image_buffer
