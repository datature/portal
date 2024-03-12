#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   folder.py
@Author  :   Beatrice Leong
@Version :   0.5.8
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Service to deal with folder related class and functions
'''
import datetime
import os

# Ignore import-error and no-name-in-module due to Pyshell
# pylint: disable=E0401, E0611
from server.services import decode, encode
from server.services.filesystem.file import File, allowed_file


class Folder:
    """
    Folder class that will contain files
    Needs to be initialized with:
    - path: path string of the folder (encoded)
    - name: name of the folder
    - update_time: last updated timestamp
    """

    def __init__(self, path, name, update_time):
        self._last_updated_ = update_time
        self._path_ = path
        self._name_ = name
        self._files_ = []
        self._folders_ = []
        self._crawl_for_allowed_files_()

    def get_path(self):
        """Obtain folder path."""
        return self._path_

    def get_name(self):
        """Obtain folder name."""
        return self._name_

    def get_files(self):
        """Obtain files within the folder."""
        return self._files_

    def get_folders(self):
        """Obtain folders within the folder."""
        return self._folders_

    def get_tree(self):
        """Create a list of filepaths within this folder."""
        return self._create_tree_(self._name_, self._path_, self._files_,
                                  self._folders_)

    def get_last_updated_time(self):
        """Obtained the last updated time of the folder."""
        return self._last_updated_

    def set_files(self, files):
        """Update the files attribute."""
        self._files_ = files

    def set_folders(self, folders):
        """Update the folders attribute."""
        self._folders_ = folders

    def set_last_updated_time(self, time):
        """Update the last_updated attribute."""
        self._last_updated_ = time

    def update_folder(self, path, time):
        """Track the folder for any changes and update them."""
        if path == self._path_:
            self._last_updated_ = time
            self._files_ = []
            self._folders_ = []
            self._crawl_for_allowed_files_()
        else:
            for index, item in enumerate(self._folders_):
                folder = item
                if path.startswith(folder.get_path()):
                    self._folders_[index] = folder.update_folder(
                        path, datetime.datetime.utcnow())
        return self

    def remove_folder(self, delete_path, parent_folders):
        """Remove the folder from the tracked folder paths."""
        for f in self._folders_:
            if delete_path == f.get_path():
                parent_folders.remove(f)
                break
            if delete_path.startswith(f.get_path()):
                f.remove_folder(delete_path, f.get_folders())
        return parent_folders

    def _create_tree_(self, name, path, files, folders):
        """
        Recursive method to create a tree with a genric format
        :param name: name of parent folder
        :param path: path of parent folder
        :param files: files of parent folder
        :param folders: folders of parent folder
        :return: dictionary with folder info
        """
        images = []
        child_nodes = []

        for i in files:
            images.append(i.get_name())
        for f in folders:
            tree = self._create_tree_(f.get_name(), f.get_path(),
                                      f.get_files(), f.get_folders())
            child_nodes.append(tree)

        return {
            "name": name,
            "path": path,
            "images": images,
            "folders": child_nodes,
        }

    def _crawl_for_allowed_files_(self):
        """
        This method crawls for images in the specified folder

        Assigns an array of <File> that has the allowed extensions
        Assigns an array of <Folder>
        :return: void
        """
        decoded_path = decode(self._path_)
        if not os.path.exists(decoded_path):
            raise FileNotFoundError("Folder path does not exists")
        try:
            # pylint: disable=unused-variable
            for file in os.listdir(decoded_path):
                folder_path = os.path.normpath(os.path.join(
                    decoded_path, file))
                if os.path.isdir(folder_path):
                    self._folders_.append(
                        Folder(
                            encode(folder_path),
                            file,
                            datetime.datetime.utcnow(),
                        ))
                else:
                    if allowed_file(file):
                        file_path = os.path.normpath(
                            os.path.join(decoded_path, file))
                        self._files_.append(File(encode(file_path), file))

        except OSError as error:
            return error

    def print(self, files, folders):
        """
        for debugging
        """
        for f in folders:
            print(f.get_name())
            for i in files:
                print(i.get_name())
            if len(f.get_folders()) != 0:
                self.print(f.get_files(), f.get_folders())
