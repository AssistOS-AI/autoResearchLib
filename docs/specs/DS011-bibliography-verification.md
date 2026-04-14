# DS011 - Bibliography Verification

## Introduction
Citation checking is part of the article build contract, not an editorial afterthought. This specification defines how bibliography caches, claim checks, and verification statuses should work so the generated article can say something more meaningful than "citations exist."

## Core Content
Each cited reference owns a cache directory under `docs/article/plan/bibliography/<CITATION_KEY>/`. That cache stores:

1. `metadata.json` - source URL, fetch status, verification mode, and source digest.
2. `source.html` - cached fetched source or an explicit manual-waiver placeholder.
3. `source.txt` - the text actually used during verification.
4. `checks.json` - checked claims, matched support profile, supporting snippet, supporting span, and verification status.

Verification is **source-backed by default**. A claim is accepted only when three conditions all hold:

1. the claim sentence matches a declared support profile for the cited reference,
2. a supporting passage is found in the cached source text for that same support profile,
3. the cached check is tied to the current source digest.

The build must distinguish verification statuses explicitly.

| Status | Meaning |
| --- | --- |
| `cached-source-supported` | claim is supported by a fetched or cached source passage tied to the current digest |
| `manual-waived` | the repository intentionally uses a curated bootstrap text because reliable automated source extraction is not yet available for that reference |
| `bootstrap-supported` | explicit emergency fallback only; not acceptable for ordinary publication builds |

`bootstrap-supported` should remain disabled by default for publication-style builds. If a source cannot be fetched and no cached source exists, the build should fail unless the caller explicitly allows bootstrap fallback. `manual-waived` is different: it must be declared in `bibliography.md` entry metadata and is intended only for references whose available source is presently unusable for deterministic passage extraction, such as some PDF-only or gated sources.

Checked claims must record the actual supporting snippet and span. If a source digest changes and a previously supported claim is no longer supported, the build should fail loudly rather than silently keeping stale support.

## Conclusion
Bibliography verification must be strict enough to stop unsupported prose, but explicit enough to show where the current workflow still relies on curated waivers. That honesty is part of the article's credibility.

### Critical Implementation Directives
1. Require source-backed support by default and store snippet-level evidence in `checks.json`.
2. Distinguish `cached-source-supported`, `manual-waived`, and `bootstrap-supported` statuses in manifests and cached checks.
3. Fail the build when refreshed sources no longer support previously accepted claims.
