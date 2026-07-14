# expand-sources test fixtures

Static fixture files for `expand-sources.test.ts`.

Files with `.pbf` and `.json` extensions are expected to appear in
`expandSources()` results. Files with other extensions (`.md`, `.txt`, `.ts`)
must NOT appear — they are present specifically to verify that the extension
filter works correctly.
