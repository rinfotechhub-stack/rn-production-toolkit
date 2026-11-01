# Support Policy

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- `0.x` — API may change; breaking changes are documented in `CHANGELOG.md`
  and recorded in `docs/DECISIONS.md`.
- `1.0.0` — only after public API review, compatibility testing, examples, and
  security review.
- Patch — backward-compatible fixes.
- Minor — backward-compatible features.
- Major — breaking API changes.

## Support window

Until `1.0.0`, only the latest `0.x` release is actively supported. Security
issues in the supported release are the highest priority.

## Migration

- Breaking changes to public contracts are never silent: they are documented in
  `CHANGELOG.md` with migration guidance.
- For `0.x`, we aim to keep `errors`/`retry`/`logger` contracts stable while the
  adapter modules mature.

## Reporting

- Security vulnerabilities: follow `SECURITY.md` (private reporting).
- Bugs and feature requests: use the issue templates.

## Contributions

See `CONTRIBUTING.md`. Contributions must include tests and documentation and
confirm license ownership.

## Honesty

We report only verifiable facts. We do not fabricate users, downloads, or
endorsements.
