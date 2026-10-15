# Licensing and distribution implementation review — 2026-10-15

The listed findings in the task were the audit baseline; no separate audit file
or repository-specific AGENTS.md was found. The review covered the current
wallpaper source, copied renderer and provenance manifest, host adapters, frozen
npm dependency graph, Lively template and repair/uninstall logic, native setup
and companion, Windows packaging script and Pages/release workflow. No Mobile
source or Mobile distribution was present in this repository.

## Implemented and artifact-checked

* The website ships full AGPL and applicable original MIT texts, the upstream
  Spicy license/provenance, the dated modification notice, original spr MIT text,
  full licenses for included npm code, and additional embedded source notices.
  The inventory comes from esbuild's emitted inputs and Vite's included modules,
  rather than all dependencies declared in package.json. Frozen installed
  versions are checked again against the final output. d3-ease retains both
  Mike Bostock and Robert Penner; SimpleBar retains Jonathan Nicol, Adrien Denat
  and Microsoft's embedded helper attribution. lodash-es retains all its
  OpenJS/Underscore attribution. Unused lodash and development tools are excluded
  from the wallpaper runtime inventory.
* Every final JS chunk must retain the legal banner. The offline license index
  and all its local links are checked under the repository base path. Accessible
  links exist in the running wallpaper and the settings dialog's keyboard order.
* The source ZIP contains all repository source inputs, including unchanged
  vendored renderer files, adapters, build scripts, workflows and lockfiles, plus
  a per-file SHA-256 manifest. Clean builds expose their full commit and immutable
  GitHub source archive; development, dirty or exported-source builds make no
  exact commit claim. Publication builds reject dirty trees. The actual shipped
  source ZIP was unpacked and rebuilt without Git, and a separate local temporary
  commit exercised clean-release artifact checks. That temporary validation
  commit was not published or used as the source identity of the workspace build.
* Lively template and packaged metadata identify the combined wallpaper as
  AGPL-3.0. New, owned, adopted and repeated repair/update registrations preserve
  unrelated user settings, launch flags and pairing. Uninstall restores unrelated
  original settings without reviving the incorrect MIT label. The separate
  companion's MIT scope is explained in setup, About, notices and release notes.
* Windows remains one self-contained installer executable inside its main ZIP.
  It embeds the companion MIT grant and complete Microsoft/runtime materials,
  exposes **Licenses** before installation and in About, and supports extraction
  without installation using `--licenses --licenses-dir <directory>`. The identical
  archive is also offered as a separate release asset.
* Windows collection uses actual resolved runtime files and the native single-file
  host template. The audit opens the real release ZIP, parses the .NET bundle,
  decompresses its 229 entries, reads the main assembly resources, compares the
  embedded archive byte for byte, checks complete license texts and metadata,
  and accounts for every bundled runtime file by its original-input hash.
* The web build and Windows packaging script fail on their artifact checks.
  Regression tests reject truncated licenses, lost banners and false source
  identity. Workflow paths include legal-material changes; Windows release assets
  include the license ZIP and exact source snapshot. Existing releases are never
  overwritten on a workflow rerun.

## Historical releases still available

The public releases listing, expanded assets, remote tags and all four downloadable
installer ZIPs were inspected read-only on 2026-10-15. Each ZIP contains only
`RetroWave-Setup.exe`. Each executable has 229 .NET bundle entries and only
`RetroWave.g.resources` and `LivelyInfo.json` as main assembly resources: no license
archive resource. All four embed `License: MIT` for the web wallpaper and include
.NET and WindowsDesktop 10.0.13 in runtime configuration.

| Release | Verified tag commit | Download ZIP SHA-256 |
| --- | --- | --- |
| [build-60](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/tag/build-60) | `98cc4774b2081dadfc93f4f6ac3ebdefc86b26e9` | `c415984845e617cdf508890ed2970865cfb305743abc62f4b71425c8591abbe1` |
| [build-55](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/tag/build-55) | `320339b7660ba33b5cc4ea56eeca3ebf6cfaaf54` | `4c298f294e6e9d9510871735b23016f31c3b21487ff1a70c280b99b6cddaf6a8` |
| [build-53](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/tag/build-53) | `df35031431b8a325168f4c2c9a160447ce40b70a` | `e458d5053878a8bd7846c7960f396580cb10868f46267952783c491d0a0a8ef6` |
| [build-48](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/tag/build-48) | `1eab68baea6b492f6890f52fbaadd8e41d1d7b27` | `2c7f6368a0e841beecd657a67ff1a2d9b0bf34d0e7b9fdda826d577aadf41835` |

These published artifacts have not been modified, deleted or replaced. They need
release-note correction and accompanying full license/notice supplements tied to
their actual bundled versions, plus conspicuous links to each exact corresponding
source archive. A corrected new release should become the recommended download;
existing users need to run its repair/update to migrate their local registrations.
Publishing supplements or editing old release notes requires authorization. A
new build cannot retroactively insert materials into already downloaded installers.

## Remaining distribution actions and limits

Commit/review the changes, run the native Windows execution/UI/package smoke
checks in the prepared workflow, then deploy the corrected website and publish a
new installer/source/license release through the normal authorized process. No
deployment or release publication was performed, no deployed-site verification
was attempted, and the historical release actions above remain outstanding.

Static inspection verifies package contents and provenance hashes; it does not
independently reconstruct or audit Microsoft's SDK-patched native single-file
host or proprietary native components. Windows GUI execution, browser association
for the Licenses buttons, installed Lively integration and repair against a real
Windows installation require Windows. Portable tests exercise the production
filesystem migration/extraction implementations, not substitutes for those native
qualification checks. The existing Windows contract/UI test projects also compile
successfully with zero warnings/errors on the Linux cross-build environment.

Microsoft's linked SDK license download redirected to a host blocked by the
environment network policy. The complete Microsoft-maintained SDK license mirror
is included instead, with pinned provenance; see `licenses/windows/PROVENANCE.md`.
This implementation review makes no claim of complete legal compliance.

## Validation results

* `pnpm install --frozen-lockfile --offline` with pnpm 11.19.0: passed against the
  available package cache; no dependency or lockfile update was required.
* Production web build, TypeScript check and final-output license/source checks:
  passed. The working-tree artifact is honestly labeled a development build.
* Existing Vitest suite: 60 tests passed. Packaging regressions: 3 tests passed,
  including negative checks for incomplete texts, removed banners and false source
  identity, and exported-source builds without Git.
* Chromium with software WebGL: all 55 tests passed across two runs. The initial
  single-worker run hit its ten-minute overall limit after 35 passes, with an old
  attribution-link expectation and a ten-second 100-row layout assertion failing.
  The attribution assertion now checks the shipped materials and complete source;
  the 100-row test allows thirty seconds for real layout and still verifies
  visibility and scrolling to the final line. Those two and the 18 unrun tests
  then all passed (20 tests, 6.8 minutes). The two new license-entry tests passed
  in the initial run.
* Windows x64 production packaging script, invoked through PowerShell on Linux:
  passed, including inspection of the actual single-installer ZIP and all 229
  executable bundle entries. It packages 15 materials covering four redistributed
  component packages: .NET runtime 10.0.13, WindowsDesktop 10.0.13, Windows
  projection pack 10.0.19041.57 and native host 10.0.13.
* Portable production-code registration/extraction tests: passed, including new,
  adopted and owned MIT migration, repeated repair/pairing, preservation of custom
  fields/flags, uninstall restoration, post-setup edits and extraction of the
  complete embedded materials. The native contract and UI test projects compile
  with zero warnings/errors; their Windows execution remains outstanding.
* Original CsWinRT license was also fetched from release tag
  `2.2.0.241111.1` (`8649ee3eeb2445ca2a36d80d878ef60b96a6c65d`) and matches the
  shipped text byte for byte (SHA-256
  `9906940f61b1f0b533fa7d99baf55178b2808fbe113ea51dfbfad8572ccd5f2b`).
* The actual corresponding-source ZIP rebuilds without Git history. A temporary
  local commit also passed clean-commit release-mode checks. These checks did not
  deploy a site or publish that validation commit.
* Workflow YAML parses; `git diff --check` passes. Existing upstream provenance
  tests continue to verify all 36 copied Spicy files byte for byte.

## Windows CI host-pack follow-up

The first PR workflow run (build 63) passed all four web shards, 122 companion
contract checks and 28 native Windows UI checks. Packaging then exposed a
platform assumption: the collector expected singlefilehost.exe under the NuGet
cache, while the Windows SDK supplied it from its installed `packs` directory.
The SDK-resolved item also omits the NuGet ID/version fields, and its pack has no
standalone license/notice files.

The collector now uses MSBuild's selected single-file host path and pack
directory, reads the actual package identity from that directory when NuGet
metadata is absent, and reuses the reviewed, byte-identical full host/runtime
license texts where necessary. It retains the pinned-version review gate.
Three additional packaging regressions cover NuGet, SDK-installed and stale-cache
layouts, bringing the packaging suite to six tests. Local artifact validation
also exercises an actual SDK-installed host pack without standalone notices;
both layouts pass the same executable/resource/runtime inventory audit.
Identical texts are referenced once in the SDK-layout archive, avoiding duplicate
host/runtime materials. The prepared Windows package smoke check still gates
merging/releasing the corrected artifact; consult the PR checks for its result.
