#! /bin/bash

set -euxo pipefail

LOCATION=${1:-"$(pwd)/.sqlanywhere"}
mkdir -p $LOCATION

if [ -d "$LOCATION/sqlanywhere17" ]
then
    echo "Libs exist, skipping"
else
  wget -q -O sqla17.tar.gz \
    https://d5d4ifzqzkhwt.cloudfront.net/sqla17developer/bin/sqla17developerlinux.tar.gz
  rm -rf $LOCATION/*
  tar -xzf sqla17.tar.gz -C $LOCATION
  cd $LOCATION/sqlany17
  ./setup -ss -I_accept_the_license_agreement -sqlany-dir $LOCATION/sqlanywhere17 -type CREATE
  rm -rf $LOCATION/sqlany17
fi

