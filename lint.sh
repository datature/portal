#!/bin/sh

PYTHONPATH=$(readlink -f src/) pylint --rcfile=.pylintrc src/engine/*.py