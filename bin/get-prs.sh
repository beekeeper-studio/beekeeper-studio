#! /bin/bash

set -euxo pipefail

TAG=`git for-each-ref --sort=creatordate --format '%(refname)' refs/tags | tail -n 1`


git log --merges --first-parent master "$TAG..HEAD" --oneline
