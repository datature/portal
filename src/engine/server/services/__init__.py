#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   <file_name>.py
@Author  :   Beatrice Leong
@Version :   0.5.8
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the file encoder and decoder.
'''
from urllib.parse import quote, unquote

ENCODING = "utf-8"


def encode(string):
    """Used for encoding file strings"""
    return quote(string.encode(ENCODING), safe="")


def decode(string):
    """Used for decoding file strings"""
    return unquote(string)
