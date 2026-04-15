#! /bin/bash

git grep -aE '^\s*(import |export .+ from |.*require\(|.*import\().*(@commercial|src-commercial)' apps/studio/src/
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "You cannot include commercial files in src/"
  exit 1;

else
  echo "No breaking imports"
  exit 0
fi
