"""Modle containing the label map loader."""
import os


def load_label_map(directory: str) -> dict:
    """Load the label map.

    :param directory: The directory to the label map.
    :returns: dictionary with integers as index and
        {"id": index, "name" label_name} as value.
    """
    label_map = {}
    with open(
        os.path.join(directory, "label_map.pbtxt"),
        "r",
    ) as label_file:
        for line in label_file:
            if "id" in line:
                label_index = int(line.split(":")[-1])
                label_name = next(label_file).split(":")[-1].strip().strip("'")
                label_map[label_index] = {
                    "id": label_index,
                    "name": label_name,
                }
    return label_map
