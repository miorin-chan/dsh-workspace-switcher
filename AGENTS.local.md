# AGENTS.local

Project rules for this DSH plugin bundle.
This file supplements [AGENTS.md](AGENTS.md); read that file first.
Adjust or extend this file for the project.
Where the two conflict, this file wins.

## Scope

This bundle provides one behavior.
Check whether new behavior belongs in its own bundle.

## Project documentation

- `README.md` is for users: installation, usage, commands, and limits.
  Provide `README.zh.md` as its Chinese version.
- `DESIGN.md` records the design, domain semantics, and invariants.
  Keep implementation status, schedules, and debugging notes out of it.
- `CHANGELOG.md` records changes for developers.
- Keep design records, proposals, and verification evidence under `docs/`, with `docs/README.md` as the index.

## Language

- For the main README, prefer English and provide a Chinese version.
- Prefer Chinese for designs and documentation.
- Keep user-facing text translatable through the project's localization mechanism,
  and maintain all eight locales (`en`, `zh`, `ja`, `de`, `es`, `fr`, `pt`, `ru`) together.
- Use English for code identifiers and keep established technical terms in English when helpful
  for precision or searchability.

## Structure

- [client.js](client.js) is the hand-written browser module.
  Read its header before changing it.
- [index.js](index.js) is the inert Host module that lets the bundle load.
- Keep Plugin Manager metadata in `locale/*.json` and runtime translations in `LABELS` in the browser module.
- The client test uses a fake `ctx` to check registration, resources, and cleanup.
- `docs/scripts/reflow` is the standalone documentation formatter and requires Python 3.11 or newer.

## Implementation

- Keep the bundle independently installable and toggleable.
  Keep runtime modules private to this bundle and put shared tools in the workspace `tools/` directory.
- Use public APIs where available. Explain required internal dependencies in the browser module header.
  If the expected structure is missing, leave DSH behavior intact and log a single `console.warn`.
- Keep the factory free of side effects.
  Register resources in `apply` with `ctx.effect` or `ctx.on` and return cleanup functions.
- Replace the placeholder icon with original artwork and update the title and description
  in all eight locale files before release.
- Resolve every scaffold placeholder before release.

## Versioning

Major version upgrades are the user's decision; regular iterations stay on the current major version.
Update `CHANGELOG.md` when releasing.

## Verification

- Run `node --test` and `node --check client.js && node --check index.js` from the project directory.
- From the workspace root, run `node tools/new-dsh-plugin/cli.mjs --check plugins/<id>` to check the manifest,
  locale JSON, and the other scaffold files.
- Use a disposable profile for installation tests.
  Distinguish fixture results from observations in the UI.
- After a DSH upgrade, run the tests and verify the behavior in the running UI.
  Record what to verify.

## Markdown

- Run `docs/scripts/reflow md <path>` to format edited Markdown.
- Run `prek install` once per checkout to format staged Markdown at commit time.
  Keep the generated `AGENTS.md` byte-for-byte identical to the shared template.
- When committing in the DSH sandbox, use `PREK_HOME="${TMPDIR:?}/prek-dsh" git commit -m "<commit message>"`
  to run the reflow hook with a writable cache and log directory.
