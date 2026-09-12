# Releases

Prompt Shelf uses Release Please to turn Conventional Commits on `main` into version tags, GitHub Releases, and the root `CHANGELOG.md`.

## One-time GitHub setting

Open **Settings → Actions → General → Workflow permissions** and enable **Allow GitHub Actions to create and approve pull requests**.

## Release flow

1. Merge feature and fix pull requests into `main` with Conventional Commit titles.
2. Release Please opens or updates one release pull request.
3. Review and merge that pull request when the accumulated changes are ready to publish.
4. Release Please creates the `vX.Y.Z` tag and matching GitHub Release.

The first release is expected to be `v0.1.0`. Release Please creates `CHANGELOG.md` in its first release pull request.

## Version rules

- `feat:` increments the minor version.
- `fix:` and `perf:` increment the patch version.
- A commit with `!` or a `BREAKING CHANGE` footer increments the minor version before `v1.0.0` and the major version afterward.
- `docs:`, `test:`, `ci:`, and `chore:` do not normally create a release.

Do not move or recreate a published release tag. Publish a new patch version instead.
