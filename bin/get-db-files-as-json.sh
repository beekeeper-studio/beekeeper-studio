#!/bin/bash

set -euxo pipefail

FILES=`find apps/studio/tests/integration/lib/db | grep "spec.js"`
JSON=`echo "$FILES" | jq -R -s -c 'split(\"n")[:-1]'`

echo "$JSON"
