#! /bin/bash

set -euxo pipefail
yarn install --frozen-lockfile
yarn run electron:build --arm64 --publish always
