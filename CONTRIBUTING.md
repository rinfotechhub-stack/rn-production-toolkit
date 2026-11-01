# Contributing

Thanks for your interest in contributing to `rn-production-toolkit`.

## Code of conduct

By participating in this project you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## What we are looking for

- Bug reports and reproducible test cases.
- Well-tested, documented improvements to existing modules.
- Corrections to documentation or compatibility statements.
- Honest reports of platform-specific behavior.

Please do **not** open PRs that:

- Add features solely to inflate the codebase.
- Introduce hidden native dependencies without a design review.
- Add telemetry, analytics, or network calls by default.
- Implement custom cryptography or claim ordinary storage is secure.

## Development setup

```bash
npm install
```

Run the standard checks before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run format:check
```

## Tests

Every public API must have tests covering both expected behavior and failure
cases. Tests must not depend on real network services, user accounts, or
private API keys. Use fake adapters and deterministic fake timers where
appropriate. Do not weaken or delete a failing test to hide a bug.

## License and ownership

This project is MIT-licensed. By contributing you confirm that you have the
right to license your contribution under the MIT License and that it is not
proprietary employer/client code. Do not copy code from repositories you do
not own.

## Pull request expectations

- Describe what changed and why.
- State whether the change is breaking (API, behavior, or platform support).
- Include testing evidence (commands run and results).
- Keep changes small and reviewable.

## Issue templates

Use the issue templates for bug reports and feature requests; they help us
triage quickly.
