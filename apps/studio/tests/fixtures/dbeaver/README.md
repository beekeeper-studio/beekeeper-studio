# DBeaver fixtures

Real output from **DBeaver CE 26.2.1** (Linux), used by the DBeaver connection
importer tests. Nothing in `workspace6/` or `General.dbp` was hand-written: every
file was serialized by DBeaver itself.

- `workspace6/General/.dbeaver/` — the default project of a DBeaver workspace
  (`~/.local/share/DBeaverData/workspace6` on Linux). 41 connections across two
  storage files (`data-sources.json` and `data-sources-team.json`), each with its
  encrypted `credentials-config*.json`.
- `General.dbp` — the same project exported with *File → Export → DBeaver →
  Project*.

All hosts and passwords are fake.

## How they were generated

DBeaver was run headless under Xvfb (`generate/start-dbeaver.sh`) with a
throwaway `HOME`. Connections were created by posting `-con` connection specs to
the running instance's local REST server (`generate/dbcon.py`, the same channel
`dbeaver -con ...` uses to reach an already-running instance).

1. `gen_phase1.py` / `gen_phase1b.py` — create connections through DBeaver's own
   spec parser: drivers, hosts, folders, credentials, auth models, SSH/SSL
   handlers (`netHandler.*`), provider properties (`advProp.*`).
2. `gen_phase2.py` — with DBeaver stopped, add what the spec syntax can't
   express (connection types, colors, read-only, URL mode, SSH jump host,
   network profile, SOCKS proxy, a second storage file).
3. Start DBeaver again and create one more connection. DBeaver then reloads and
   re-serializes every storage file, so the final files are its canonical
   output.
4. Export the project from the GUI (driven with `xdotool`) to get `General.dbp`.

To decrypt a credentials file by hand:

```bash
F=credentials-config.json
openssl aes-128-cbc -d -K babb4a9f774ab853c96c2d653dfe544a \
  -iv "$(head -c 16 $F | od -An -tx1 | tr -d ' \n')" -in <(tail -c +17 $F)
```
