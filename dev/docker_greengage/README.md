# Greengage DB in Docker

Images: [ggdb6_ubuntu](https://hub.docker.com/r/greengagedb/ggdb6_ubuntu/tags), [ggdb7_ubuntu](https://hub.docker.com/r/greengagedb/ggdb7_ubuntu/tags).

## Greengage 7

From repo root:

```bash
docker compose up -d greengage7
```

On first start the container runs `init-and-run.sh` (install, make_cluster, pg_hba for host access). Connect after a few minutes.

**Beekeeper Studio:** Host localhost, **port 5439**, user gpadmin, password password (or empty with trust), database postgres.

## Greengage 6

Same as v7: `init-and-run.sh` runs on first start.

```bash
docker compose up -d greengage
```

Port **5438**. User gpadmin, password password (or empty with trust). See [docs](https://greengagedb.org/en/docs-gg/current/use_docker.html).
