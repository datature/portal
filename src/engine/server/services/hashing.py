#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   hashing.py
@Author  :   Marcus Neo
@Version :   0.5.6
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   A service responsible for hashing.
'''
import hashlib
from dirhash import dirhash


def get_hash(path_to_directory: str) -> str:
    """Obtain the hash given the directory.

    :param path_to_directory: Directory to execute the hashing function.
    :return: Hash string.
    """
    directory_contents_hash = dirhash(path_to_directory, "md5")
    double_hash = hashlib.md5(
        (directory_contents_hash + path_to_directory).encode())

    return double_hash.hexdigest()
