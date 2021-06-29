"""A service to deal with hashing."""
import hashlib
from dirhash import dirhash


def get_hash(path_to_directory: str) -> str:
    """Obtain the hash given the directory.

    :param path_to_directory: Directory to execute the hashing function.
    :return: Hash string.
    """
    directory_contents_hash = dirhash(path_to_directory, "md5")
    double_hash = hashlib.md5(
        (directory_contents_hash + path_to_directory).encode()
    )

    return double_hash.hexdigest()
