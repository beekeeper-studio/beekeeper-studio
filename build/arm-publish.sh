#! /bin/bash

set -euxo pipefail
yarn install --frozen-lockfile
yarn run electron:build --arm64 --publish always
PI_BUILD=true yarn run electron:build --armv7l --publish always
yarn run electron:build --armv7l --linux deb --publish always