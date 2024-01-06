#! /bin/bash

git grep -a "window\.confirm" apps/studio/src
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "Found native dialogs. Please avoid using the native dialogs."
  exit 1;

else
  echo "OK. No native dialogs found."
  exit 0
fi
