#! /bin/bash

git grep -a "electron-log" apps/studio/src* ':!*preload.ts' ':!*Logger.ts'
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "We no longer use electron-log directly, please import from '@bksLogger'"
  exit 1;
fi

git grep -a \( -e mainLogger -e rendererLogger -e utilityLogger \) apps/studio/src* ':!*bksLogger.ts'

STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "Please don't import from mainLogger.ts, rendererLogger.ts, or utilityLogger.ts. Use '@bksLogger' instead"
  exit 1;
else
  echo "No bad imports"
  exit 0;
fi
