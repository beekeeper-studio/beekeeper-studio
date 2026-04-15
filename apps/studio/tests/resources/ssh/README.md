# SSH test fixtures

**Do not use these keys for anything real.**

These are throwaway keys used by the Windows integration test in
`tests/integration/windows/ssh/pageant.spec.js`. The CI workflow
(`windows-tests.yml`) copies them into the runner's `~/.ssh/`, authorizes
the public key against a freshly-installed local sshd, and loads the
private key into Pageant - all inside an ephemeral GitHub Actions VM that
is torn down after the test completes.

The keys do not grant access to any production system. They only authorize
against the sshd the test itself provisions on `127.0.0.1`.

Committed so CI doesn't have to run `ssh-keygen` on every run (keeps the
workflow smaller and more deterministic).

## Files

- `pageant_test` - PEM-format RSA private key (passphrase-less, 2048-bit),
  generated with `ssh-keygen -m PEM`. Starts with
  `-----BEGIN RSA PRIVATE KEY-----`.
- `pageant_test.pub` - OpenSSH public key

PEM format is used instead of ssh-keygen's default OpenSSH-v1 envelope
(`-----BEGIN OPENSSH PRIVATE KEY-----`) because Pageant's parser for the
v1 format hangs its message loop on headless CI when it hits an edge case,
blocking WM_COPYDATA replies forever. PEM is the older, simpler format
every SSH tool parses reliably.
