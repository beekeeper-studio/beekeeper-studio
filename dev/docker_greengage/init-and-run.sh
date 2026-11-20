#!/bin/bash

set -e

if [ -f /gpdb_src/concourse/scripts/common.bash ]; then
  REPO_ROOT="/"
elif [ -f gpdb_src/concourse/scripts/common.bash ]; then
  REPO_ROOT="$(pwd)"
else
  COMMON_BASH="$(find / -maxdepth 6 -name 'common.bash' -path '*/concourse/scripts/*' 2>/dev/null | head -1)"
  [ -n "$COMMON_BASH" ] || { echo "Cannot find common.bash"; exit 1; }
  REPO_ROOT="$(dirname "$(dirname "$(dirname "$(dirname "$COMMON_BASH")")")")"
  [ -f "$REPO_ROOT/gpdb_src/concourse/scripts/common.bash" ] || { echo "Invalid REPO_ROOT: $REPO_ROOT"; exit 1; }
fi
cd "$REPO_ROOT"

source gpdb_src/concourse/scripts/common.bash
# Only unpack the prebuilt binaries. install_and_configure_gpdb would also run
# ./configure on the source tree (15-30s), which creating the demo cluster
# does not need.
install_gpdb
gpdb_src/concourse/scripts/setup_gpadmin_user.bash
make_cluster

su - gpadmin -c "cd $REPO_ROOT && \
  source /usr/local/greengage-db-devel/greengage_path.sh && \
  source gpdb_src/gpAux/gpdemo/gpdemo-env.sh && \
  DATA_DIR=\"\${COORDINATOR_DATA_DIRECTORY:-\$MASTER_DATA_DIRECTORY}\" && \
  echo \"host all all 0.0.0.0/0 trust\" >> \"\$DATA_DIR/pg_hba.conf\" && \
  gpstop -u"

# PID 1 ignores SIGTERM unless it has a handler, which makes `docker stop`
# wait out its full grace period. Exit straight away instead.
trap 'exit 0' TERM INT
sleep infinity &
wait $!
