#! /bin/bash

git grep -a "electron-log" apps/studio/src* ':!*preload.ts' ':!*Logger.ts'
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "We no longer use electron-log directly, please import from '@bksLogger'"
  exit 1;

else
  echo "No bad log imports"
  exit 0
fi
