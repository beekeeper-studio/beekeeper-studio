#!/usr/bin/env bash
# Loads the Postgres dev dataset described in README.md. The postgres image runs this
# once, on first start with an empty data directory. Files that need a newer server
# than the one running are skipped, so the same directory works for 9.6 through 17+.
set -eo pipefail

bks_seed_dir=/docker-entrypoint-initdb.d/seed
bks_pg_major=$(( $(psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'SHOW server_version_num') / 10000 ))

bks_seed() {
  local db=$1 file=$2
  echo "dev seed: loading $file into $db"
  psql -X -q -v ON_ERROR_STOP=1 -o /dev/null -U "$POSTGRES_USER" -d "$db" -f "$bks_seed_dir/$file"
}

bks_seed_min_version() {
  local min_major=$1 file=$2
  if [ "$bks_pg_major" -ge "$min_major" ]; then
    bks_seed "$POSTGRES_DB" "$file"
  else
    echo "dev seed: skipping $file (needs PostgreSQL $min_major+, server is $bks_pg_major)"
  fi
}

bks_seed "$POSTGRES_DB" 00_setup.sql
bks_seed "$POSTGRES_DB" 10_core.sql
bks_seed "$POSTGRES_DB" 20_wide.sql
bks_seed "$POSTGRES_DB" 30_text_json.sql
bks_seed "$POSTGRES_DB" 40_binary.sql
bks_seed "$POSTGRES_DB" 50_inheritance_partitioning.sql
bks_seed_min_version 11 60_partitioning.sql
bks_seed_min_version 12 70_generated_columns.sql
bks_seed_min_version 14 71_multiranges.sql
bks_seed "$POSTGRES_DB" 90_views.sql
bks_seed "$POSTGRES_DB" 99_finish.sql

createdb -U "$POSTGRES_USER" -E LATIN1 --locale=C -T template0 legacy_latin1
bks_seed legacy_latin1 legacy_latin1.sql

createdb -U "$POSTGRES_USER" -E SQL_ASCII --locale=C -T template0 legacy_sql_ascii
bks_seed legacy_sql_ascii legacy_sql_ascii.sql
