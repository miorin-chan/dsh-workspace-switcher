# AGENTS.local

Project rules for this DSH plugin bundle.
This file supplements [AGENTS.md](AGENTS.md); read that file first.
Adjust or extend this file for the project.
Where the two conflict, this file wins.

## Scope

This bundle provides one behavior.
Check whether new behavior belongs in its own bundle.

## Workspace aggregate

This bundle belongs to `@miorin/dsh-atlas-workspace`.
Keep its row id stable and coordinate new workspace-facing behavior
with the aggregate's `aggregate.yml` and documentation.
The aggregate and this bundle insert the same row id, so do not install both.

## Project documentation

- `README.md` is for users: installation, usage, commands, and limits.
  Provide `README.zh.md` as its Chinese version.
- `DESIGN.md` records the design, domain semantics, and invariants.
  Keep implementation status, schedules, and debugging notes out of it.
- `CHANGELOG.md` records changes for developers.
- Keep design records, proposals, and verification evidence under `docs/`, with `docs/README.md` as the index.
- Keep the plugin detail page short and easy to scan.
  Use plain language and show only what the user needs to know or do right away.
  Reveal details as needed.

## Language

- For the main README, prefer English and provide a Chinese version.
- Prefer Chinese for designs and documentation.
- Keep user-facing text translatable through the project's localization mechanism,
  and maintain all eight locales (`en`, `zh`, `ja`, `de`, `es`, `fr`, `pt`, `ru`) together.
- Use English for code identifiers and keep established technical terms in English when helpful
  for precision or searchability.

## Structure

`npm run build:tools` compiles `.mts` tooling in `scripts/` to adjacent ignored `.mjs` files.
Node.js 22.18 or newer runs the `.test.mts` files directly.

- `src/client/` holds the browser half.
  `node scripts/build.mjs` generates `client.js`, which Git ignores.
  Read the header of [src/client/index.ts](src/client/index.ts) before changing it.
  Never edit the artifact: the `--check` in `npm run check` keeps it in step with the sources.
  - `index.ts` registers the locale dictionaries and shadows the shipped hero picker.
  - `remote.ts` wraps the DSH services and builds the hero slot's inject face.
  - `view.ts` renders the picker; `components.ts` and `glyphs.ts` hold its pieces.
  - `model.ts` is the pure row, recency, and filter model; `labels.ts` and `styles.ts` hold the runtime copy
    and the component stylesheet.
- `src/host/index.ts` is the inert Host half that lets the bundle row load.
- `tsconfig.json`, `scripts/build.mts`, and `scripts/sync-types.mts` are the TypeScript base,
  copied from the workspace `tools/dsh-plugin-ts/` template.
  Import DSH declarations as types. The Client build may use `@deepseek-ai/dsh-client-ui-primitives`
  from the DSH Web shell's shared platform module table for public menu controls and icons.
- [test/client.test.mts](test/client.test.mts) drives the pure model through the built `client.js`
  with a fake `ctx` that checks registration, resources, and cleanup.
  The test loads the artifact, so the source migration does not change it.
- Keep Plugin Manager metadata in `locale/*.json`; runtime translations live in `LABELS` in `src/client/labels.ts`.
- `docs/scripts/reflow` is the standalone documentation formatter and requires Python 3.11 or newer.

## Reusing native DSH UI

- Prefer native DSH components, behavior, theme tokens, and layouts from comparable screens
  to reduce code and maintenance.
- Prefer runtime reuse through supported slots, component factories,
  or host-provided modules when performance is acceptable.
  Let the host supply the implementation and write only the code needed to fill gaps in existing components
  and extension points.
- When statically importing or bundling official code or assets, annotate the reference
  with the upstream package, version or commit, source path, and symbol name.
  Keep applicable licenses and attribution so future updates can be traced to the source.

## Implementation

- Keep the bundle independently installable and toggleable.
  Keep runtime modules private to this bundle and put shared tools in the workspace `tools/` directory.
- Implement new behavior through supported DSH plugin APIs and extension points.
  Keep DSH source and installed files intact.
  Do not patch global behavior or override DSH internals.
  When an extension point is missing, report the gap and stay within supported scope.
- Use TypeScript for plugin source unless otherwise specified.
  Reuse the DSH type declarations for the supported runtime version.
  Retain types across interfaces, configuration, and events, validate and narrow unknown inputs,
  and keep type dependencies in sync.
- Keep the factory free of side effects.
  Register resources in `apply` with `ctx.effect` or `ctx.on` and return cleanup functions.
- Prefer recognizable icons for common action buttons, and use visible text only
  when an icon alone would leave the action unclear.
- Replace the placeholder icon with original artwork and update the title and description
  in all eight locale files before release.
- Resolve every scaffold placeholder before release.

## Versioning

Major version upgrades are the user's decision; regular iterations stay on the current major version.
Update `CHANGELOG.md` when releasing.

## Verification

- Run `pnpm install --frozen-lockfile` in a fresh checkout before `npm run check`.
  The check runs `node --test`, `tsc -p tsconfig.json`, `node scripts/build.mjs --check`,
  and `node scripts/sync-types.mjs --check` to verify behavior, types, artifact freshness,
  and the pinned type packages in that order.
  Use `npm run build` to regenerate artifacts after editing the source.
- After a DSH upgrade, run `node scripts/sync-types.mjs` to repin the type packages,
  then `npm run check`, then verify the picker in the running UI.
  Record what to verify.
- From the default workspace root, run `node tools/new-dsh-plugin/cli.mts --check plugins/dsh-workspace-switcher`
  to check the manifest, locale JSON, and the other scaffold files.
- Use a disposable profile for installation tests.
  Distinguish fixture results from observations in the UI.

## Markdown

- Run `docs/scripts/reflow md <path>` to format edited Markdown.
- Run `prek install` once per checkout to format staged Markdown at commit time.
  Keep the generated `AGENTS.md` byte-for-byte identical to the shared template.
- When committing in the DSH sandbox, use `PREK_HOME="${TMPDIR:?}/prek-dsh" git commit -m "<commit message>"`
  to run the reflow hook with a writable cache and log directory.
