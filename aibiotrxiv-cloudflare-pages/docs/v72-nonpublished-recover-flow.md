# v72 non-published recovery flow

This version changes admin publication-state recovery behavior so that a manuscript that is no longer publicly published is stored back in the Accepted papers queue rather than remaining in a published/unpublished holding state.

## Main behavior

- Unpublish now deletes the published PDF/HTML R2 objects and returns the manuscript to `aibio_accepted`.
- Recover from Published manuscript management also deletes the published PDF/HTML R2 objects and returns the manuscript to `aibio_accepted`.
- Recover from Unpublished papers handles legacy unpublished records and returns them to `aibio_accepted`.
- Non-published manuscript records have `pdf`, `pdfR2Key`, `htmlR2Key`, `pdfFileName`, and generation metadata removed before storage.
- Member dashboard state is synchronized back to `accepted` / `reviewStatus=accepted` and published PDF/HTML metadata is removed.

## R2 safety

Only explicit `published/<articleId>/<version>/...` keys recorded on the manuscript are deleted. The R2 delete endpoint still blocks unsafe folder, wildcard, and non-published-prefix deletions.
