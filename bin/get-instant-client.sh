#! /bin/bash

set -euxo pipefail

LOCATION=${1:-".instant"}
mkdir -p $LOCATION

if [ -d "$LOCATION/instantclient_21_6" ]
then
    echo "Libs exist, skipping"
else
  wget -q -O cli.zip \
    https://download.oracle.com/otn_software/linux/instantclient/216000/instantclient-basic-linux.x64-21.6.0.0.0dbru.zip
  # wget -q -O cli.zip \
  #   https://download.oracle.com/otn_software/linux/instantclient/23c/instantclient-basic-linux.x64-23.3.0.0.0.zip
  rm -rf $LOCATION/*
  unzip cli.zip -d $LOCATION
fi

