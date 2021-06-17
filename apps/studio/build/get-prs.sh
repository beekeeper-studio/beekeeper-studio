#! /bin/bash

set -euxo pipefail

TAG="$1"


git log --merges --first-parent master "$TAG..HEAD" --oneline
