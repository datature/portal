"""
Service to deal with the targeted folder (folder selected by user)
"""

import datetime
import os

# Ignore import-error and no-name-in-module due to Pyshell
# pylint: disable=E0401, E0611
from server.services import decode, encode
from server.services.errors import PortalError, Errors
from server.services.filesystem.folder import Folder


class FolderTargets:
    """
    Folder target class that will contain both folders and files
    Needs to be initialized with:
    - path: path string of the targeted folder (encoded)
    """

    def __init__(self):
        self._folders_ = []

    def get_folders(self):
        return self._folders_

    def get_assets(self):
        return self._flatten_assets_([], self._folders_)

    def get_tree(self):
        trees_arr = []
        for folder in self._folders_:
            trees_arr.append(folder.get_tree())
        return trees_arr

    def update_all_folders(self):
        for index, folder in enumerate(self._folders_):
            decoded_path = os.path.normpath(decode(folder.get_path()))
            if not os.path.isdir(decoded_path):
                self._folders_.pop(index)
            else:
                self._folders_[index] = folder.update_folder(
                    folder.get_path(), datetime.datetime.utcnow()
                )

    def update_folder(self, path):
        # Ensure all encoded path are encoded with the same format
        decoded_path = os.path.normpath(decode(path))
        if not os.path.isdir(decoded_path):
            self.delete_folder(path)
            raise PortalError(
                Errors.INVALIDFILETYPE,
                f"{decoded_path} is no longer a directory. Deleted it from assets",
            )

        path = encode(decoded_path)
        for index, item in enumerate(self._folders_):
            folder = item
            if path.startswith(folder.get_path()):
                self._folders_[index] = folder.update_folder(
                    folder.get_path(), datetime.datetime.utcnow()
                )
                break

    def delete_folder(self, path):
        # Ensure all encoded path are encoded with the same format
        path = encode(os.path.normpath(decode(path)))
        for item in self._folders_:
            f = item
            if path == f.get_path():
                self._folders_.remove(f)
                return
            if path.startswith(f.get_path()):
                f.remove_folder(path, f.get_folders())

    def add_folders(self, path):
        is_exist = False
        decoded_path = os.path.normpath(decode(path))
        # Makes sure path is a folder
        if not os.path.isdir(decoded_path):
            raise PortalError(
                Errors.INVALIDFILETYPE, f"{decoded_path} is not a directory"
            )
        # Ensure all encoded path are encoded with the same format
        path = encode(decoded_path)
        # pylint: disable=unused-variable
        _, tail = os.path.split(decoded_path)
        for index, item in enumerate(self._folders_):
            folder = item
            # check if folder exists
            if path.startswith(folder.get_path()):
                is_exist = True
                self._folders_[index] = folder.update_folder(
                    path, datetime.datetime.utcnow()
                )
                break
        if not is_exist:
            self._folders_.append(
                Folder(path, tail, datetime.datetime.utcnow())
            )

    def _flatten_assets_(self, arr, folders):
        """
        This method recursively flattens the files in the list of folders given
        Used in the self.get_assets() method
        :param arr: array to add on the files in the array of folders
        :param folders: array of folders to search the files from
        :return: flattened array of files
        """
        for f in folders:
            for file in f.get_files():
                arr.append(file.get_path())
            arr = self._flatten_assets_(arr, f.get_folders())
        return arr
