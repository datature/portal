"""Modle containing the label map loader."""
import os


def load_label_map(directory: str, model_type: str) -> dict:
    """Load the label map.

    :param directory: The directory to the label map.
    :param: model_type: The type of model that is being used.
    :returns: dictionary with integers as index and
        {"id": index, "name" label_name} as value.
    """
    label_map = {}
    if model_type == "tensorflow":
        with open(
            os.path.join(directory, "label_map.pbtxt"),
            "r",
        ) as label_file:
            for line in label_file:
                if "id" in line:
                    label_index = int(line.split(":")[-1])
                    label_name = (
                        next(label_file).split(":")[-1].strip().strip("'")
                    )
                    label_map[label_index] = {
                        "id": label_index,
                        "name": label_name,
                    }
    if model_type == "darknet":
        label_dir = ""
        for file in os.listdir(directory):
            if file.endswith(".names"):
                label_dir = file

        labels = (
            open(os.path.join(directory, label_dir)).read().strip().split("\n")
        )
        label_map = {
            label_index: {"id": label_index, "name": label_name}
            for label_index, label_name in enumerate(labels)
        }
    return label_map
