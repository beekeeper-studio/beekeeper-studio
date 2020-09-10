#! /bin/bash

set -euxo pipefail

yarn run electron:build --arm64 --armv7l --publish always
