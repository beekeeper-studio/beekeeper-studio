#! /bin/bash

git grep -a "\.only" apps/studio/tests/
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "Found tests with .only still there"
  exit 1;

else
  echo "tests look good"
  exit 0
fi
