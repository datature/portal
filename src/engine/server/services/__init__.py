from urllib.parse import quote, unquote

ENCODING = "utf-8"


def encode(string):
    return quote(string.encode(ENCODING), safe="")


def decode(string):
    return unquote(string)
