# Publishing Guide

This guide is for the maintainer. Publishing is an irreversible-ish, public
action — perform it only after full verification and with authorization.

## 1. Preflight

- Confirm ownership/rights to license all code under MIT.
- Confirm the npm name is available and the scope is owned:
  ```bash
  npm view @rn-production-toolkit/core
  ```
- Confirm the package root contains its own `LICENSE` and `README.md`
  (`packages/core/`), so the published tarball is self-contained.
- Review `git status`; ensure no secrets or local artifacts are staged.

## 2. Clean checks

From the repository root:

```bash
npm ci
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present
npm run build
npm run test --workspaces --if-present
npm run format:check --workspaces --if-present
```

A clean-environment spot check (fresh copy + `npm ci`) is recommended before
release.

## 3. Inspect the package

```bash
cd packages/core
npm pack --dry-run
```

Expected contents: `dist/` (built artifacts + type declarations), `package.json`,
`LICENSE`, and `README.md`. No source, tests, or `node_modules`.

## 4. Publish

Authenticate first (`npm login`, or a CI token with publish scope for the
`@rn-production-toolkit` scope). Then:

```bash
cd packages/core
npm publish --provenance   # if the registry supports provenance
```

`prepublishOnly` will rebuild `dist/` immediately before publish. For the
initial release, publish `0.1.0` (a pre-release is acceptable).

## 5. Tag and release

- Tag the exact source revision that was published:
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  ```
- Create a GitHub release using accurate notes (see `RELEASE_NOTES.md`). Do not
  over-claim compatibility or adoption.

## 6. Post-publish verification

- Install from the registry into a scratch project and smoke-test imports.
- Confirm tarball size and that type declarations resolve.

## 7. Reversion/rollback

- Prefer deprecating a bad version (`npm deprecate`) over `npm unpublish`,
  which has strict time/access rules.

## 8. Ongoing maintenance

- Triage issues and review pull requests promptly and fairly.
- Keep dependencies and security updates current.
- Track npm downloads/repo activity using public, verifiable metrics only.
