# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Report sensitive issues privately by emailing the maintainers.

**Maintainer contact:** rinfotechhub@gmail.com

When reporting, please include:

- The package and version affected.
- A description of the vulnerability and its impact.
- Steps to reproduce, if available.
- Any suggested remediation.

You will receive an acknowledgment, and we will work to triage and address the
issue. We ask that you allow reasonable time before public disclosure.

## Scope

This project is a developer toolkit. We take the following seriously:

- Accidental leakage of secrets (API keys, tokens, passwords) into logs or
  committed files.
- Any module that could be misused to exfiltrate user data.
- Dependencies with known critical vulnerabilities.

## What this project does not claim

- This toolkit does not implement cryptography or secure storage.
- Helpers here do not make an application "secure" on their own; integration
  limits are documented per module.

## Secrets and committed files

Do not commit credentials, `.env` files, signing keys, keystores, or
provisioning profiles. The repository `.gitignore` excludes these patterns.
CI includes a secret scan; treat scan failures as release-blocking.

## Supported versions

Until `1.0.0`, only the latest `0.x` release is actively supported.
