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

    def update_folders(self, path):
        # Ensure all encoded path are encoded with the same format
        path = encode(os.path.normpath(decode(path)))
        for i in range(len(self._folders_)):
            folder = self._folders_[i]
            if path.startswith(folder.get_path()):
                self._folders_[i] = folder.update_folder(
                    folder.get_path(), datetime.datetime.utcnow()
                )
                break

    def delete_folder(self, path):
        # Ensure all encoded path are encoded with the same format
        path = encode(os.path.normpath(decode(path)))
        for i in range(len(self._folders_)):
            f = self._folders_[i]
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
            raise PortalError(Errors.INVALIDFILETYPE, f"{decoded_path} is not a directory")
        # Ensure all encoded path are encoded with the same format
        path = encode(decoded_path)
        # pylint: disable=unused-variable
        head, tail = os.path.split(decoded_path)
        for i in range(len(self._folders_)):
            folder = self._folders_[i]
            # check if folder exists
            if path.startswith(folder.get_path()):
                is_exist = True
                self._folders_[i] = folder.update_folder(
                    path, datetime.datetime.utcnow()
                )
                break
        if not is_exist:
            self._folders_.append(Folder(path, tail, datetime.datetime.utcnow()))

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
