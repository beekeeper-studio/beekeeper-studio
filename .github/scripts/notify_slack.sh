#!/bin/bash
set -euo pipefail

# usage: notify_slack.sh <message>
# env: SLACK_WEBHOOK - incoming webhook URL for the target channel
#
# Message is passed through jq so quoting/newlines can't break the payload.

MESSAGE="${1:?usage: notify_slack.sh <message>}"

jq -n --arg text "$MESSAGE" '{text: $text}' \
  | curl -sf -X POST -H 'Content-Type: application/json' -d @- "$SLACK_WEBHOOK"
