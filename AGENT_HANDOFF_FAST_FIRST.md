# Fast-First Thumbnail Plan - Agent Handoff

Date: 2026-03-17
Host: LXC 114 (immich-dev)
Repo: /opt/immich

## Goal
Prioritize quickly visible thumbnails (images first), defer heavier video/ML processing.

## Agreed Plan

### 1) Immediate (no backend changes, queue steering only)
- Pause queues: `videoConversion`, `faceDetection`, `facialRecognition`, `smartSearch`, `ocr`
- Run queues: `library`, `metadataExtraction`, `thumbnailGeneration`
- When `thumbnailGeneration.waiting` is low (example: `< 1000`):
  - Resume `videoConversion`
  - Then resume face/ML queues

### 2) Small backend change (highest impact)
- In `AssetGenerateThumbnailsQueueAll`: queue image assets first, video/gif later.
- Optional later split:
  - `imageThumbnailGeneration`
  - `videoPreviewGeneration`

### 3) Preview-first logic (best UX, optional)
- If thumbnail missing:
  - JPG/PNG/WebP: temporary original/on-the-fly resize fallback
  - RAW/JPG with embedded preview: use embedded preview first
  - regenerate proper derivatives in background
- Keep ffmpeg-heavy work last / video-only.

### 4) Visibility-first v2 (new)
- During thumbnail queue-all selection:
  - newest assets first (`localDateTime DESC`)
  - image stage first, video/gif stage second (already done)
  - effect: latest JPG/HEIC should appear first, oldest videos naturally last
- UI thumbnail fallback chain for images:
  - `thumbnail` -> `preview` -> `original`
  - avoid "broken thumbnail" cards while derivatives are still being generated

### 5) EXIF-first thumbnail generation (new, requested)
- For JPEG inputs:
  - try embedded EXIF preview first
  - accept it when resolution is at least thumbnail target size
  - generate Immich thumbnail/preview derivatives from this extracted buffer
  - fallback automatically to normal original-file decode if missing/too small
- For RAW inputs:
  - keep existing behavior (`image.extractEmbedded` gate, preview-size threshold)
- Keep edits/full-quality flows safe:
  - EXIF-first path applies to non-edited thumbnail generation only
  - edited derivatives stay on normal source to avoid coordinate mismatches

### 6) Latest-first external scan (new, requested)
- Goal: when adding a large external library, make recent images appear in UI first (fast visibility > perfect ordering).
- Fast timestamp heuristic for import queue ordering:
  1. Samsung filename pattern (`YYYYMMDD_HHMMSS.jpg`)
  2. date-like folder/path segment (`YYYY-MM-DD` or `YYYYMMDD`)
  3. filesystem timestamp (`birthtime`, fallback `mtime`)
  4. EXIF remains background correction (not in initial queue path for performance)
- Queueing behavior:
  - keep streaming crawl
  - maintain a scored in-memory buffer
  - warm up buffer briefly, then queue top newest chunk first
  - continue bounded-buffer flushing while crawl runs
  - flush remaining scored paths at the end

## Current Implementation Status

### Done
- Step 2 implemented (image-first enqueue ordering) on branch:
  - `feat/fast-first-thumbs`
  - latest commit: `a946dfd38`
- Branch base model prepared:
  - `vanilla-main` = `upstream/main`
  - `main_mwa` = `vanilla-main` + custom commits (path search + admin server stats)
- Code changes made:
  - `server/src/repositories/asset-job.repository.ts`
    - added stage filter to `streamForThumbnailJob` (`stage: image|video`)
  - `server/src/services/media.service.ts`
    - queue order: image assets -> people -> video/gif assets
    - avoid empty `queueAll` submissions
  - `server/src/services/media.service.spec.ts`
    - updated to assert new ordering behavior
  - `server/src/queries/asset.job.repository.sql`
    - SQL snapshot adjusted for new staged image query
- Admin server stats queue controls restored on this branch:
  - `Pause | Resume | Start`
  - paused queues keep waiting + ETA visible
- Step 5 implemented on `feat/fast-first-thumbs`:
  - `server/src/services/media.service.ts`
    - JPEG EXIF preview is now tried first for non-edited thumbnails
    - minimum extracted-size threshold: thumbnail size for JPEG, preview size for RAW
    - automatic fallback to original decode path if missing/too small
  - `server/src/services/media.service.spec.ts`
    - added tests for JPEG EXIF-first and JPEG fallback behavior

- Step 6 implemented on `feat/fast-first-thumbs`:
  - `server/src/services/library.service.ts`
    - streaming latest-first queue scoring (Samsung filename -> path date -> filesystem time)
    - warmup + bounded buffer chunking for fast visibility while scanning
  - `server/src/services/library.service.spec.ts`
    - added tests for newest Samsung filename ordering
    - added tests for filesystem timestamp fallback ordering

### Validation done
- Node toolchain installed in CT114:
  - Node `v24.14.0`
  - npm `11.9.0`
  - pnpm `10.30.3`
- Tests passing:
  - `pnpm test src/services/media.service.spec.ts` -> passed
  - `pnpm test:medium test/medium/specs/repositories/asset-job.repository.spec.ts` -> passed
  - `pnpm test src/services/media.service.spec.ts -t "JPEG EXIF|extract embedded image if enabled and available|resize original image if embedded image is too small|resize original image if embedded image extraction is not enabled"` -> passed
  - `pnpm test src/services/library.service.spec.ts` -> passed

## Infra/Mapping Status (CT114)
- Added LXC mount:
  - `/mnt/3.6tb_ssd_crucial_x9/Fotos/Marcel` -> `/media/marcel` (ro)
- Added container bind mount:
  - `/media/marcel` -> `/external/marcel` (ro)
- Usable in Immich Admin for external library path:
  - `/external/marcel`

## Notes / Risks
- `/external/marcel` overlaps with already mounted subfolders (`/external/3d-basteln`, `/external/bett`, `/external/decentlab`, `/external/insta360`):
  - potential duplicate imports unless excluded or library scope is adjusted.
- Current blocker in CT114 at implementation time:
  - root disk is full (`/` at 100%)
  - `immich_postgres` restart loop: `No space left on device`
  - this impacts live verification until free space/disk expansion is done

## Next Recommended Steps
1. Implement visibility-first v2 changes:
   - DB query ordering (newest first) in thumbnail queue-all
   - image fallback chain (`thumbnail -> preview -> original`) in web thumbnail component
2. Verify on large external library import:
   - latest timeline cards become visible quickly
   - reduced broken-thumbnail cards
3. Add optional Queue Preset “Fast first” in UI/API orchestration.
