#! /bin/bash

git grep -a "electron-log" apps/studio/src* ':!*preload.ts' ':!*Logger.ts' ':!*lib/log/redact.ts' ':!*lib/log/logLevel.ts' ':!*bksLogger.d.ts'
STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "We no longer use electron-log directly, please import from '@bksLogger'"
  exit 1;
fi

git grep -a \( -e mainLogger -e rendererLogger -e utilityLogger \) apps/studio/src* ':!*bksLogger.d.ts'

STATUS=$?

if [[ $STATUS -eq 0 ]]
then
  echo "Please don't import from mainLogger.ts, rendererLogger.ts, or utilityLogger.ts. Use '@bksLogger' instead"
  exit 1;
else
  echo "No bad imports"
  exit 0;
fi
