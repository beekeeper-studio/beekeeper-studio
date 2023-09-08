#!/bin/bash
set -euxo pipefail

# Install curl
# apt update
# apt install -y axel procps htop

# # Change directory to /work
# cd /work

# # Download and install Google cloud sdk
# export FILENAME=google-cloud-cli-430.0.0-linux-x86_64.tar.gz
# [ ! -f $FILENAME ] && axel -k https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/$FILENAME
# tar -xvzf $FILENAME
# /work/google-cloud-sdk/install.sh -q
# # Add gcloud to PATH
# source /work/google-cloud-sdk/path.bash.inc
# echo "source /work/google-cloud-sdk/path.bash.inc" >> ~/.bashrc

# Start BigQuery emulator
/bin/bigquery-emulator --log-level=debug --project=bks --data-from-yaml=/data/world.yaml
