# AI Reel Cutter Integration

## Environment Variables

Add these in backend .env:

- HF_REEL_CUTTER_BASE_URL
  - Default: https://rajan18-studiox-reel-cutter.hf.space
- HF_REEL_CUTTER_HEALTH_TIMEOUT_MS
  - Default: 10000
- HF_REEL_CUTTER_PROGRESS_CONNECT_TIMEOUT_MS
  - Default: 20000
- HF_REEL_CUTTER_GENERATE_TIMEOUT_MS
  - Default: 1800000
- HF_REEL_CUTTER_RETRY_COUNT
  - Default: 2
- HF_REEL_CUTTER_RETRY_DELAY_MS
  - Default: 1200

## Backend Endpoints

- POST /api/reel-cutter/generate
  - multipart form-data
  - exactly one source:
    - yt_url string
    - video_file file
  - optional fields:
    - num_reels, min_duration, max_duration
    - resolution: 720p | 1080p
    - add_captions
    - caption_font_size
    - caption_color
    - job_id

- GET /api/reel-cutter/progress/:jobId
  - SSE stream

- GET /api/reel-cutter/status/:jobId
  - JSON polling fallback

- GET /api/reel-cutter/download/:jobId
  - ZIP download

## Test Cases

### Happy Path

1. YouTube URL input
- Send yt_url only
- Expect 202 from generate with job_id
- Expect progress SSE events with stage and pct
- Expect completed state
- Expect download endpoint returns ZIP

2. File upload input
- Send video_file only
- Expect same behavior as above

### Validation Failures

3. Both inputs provided
- Send yt_url and video_file
- Expect 422 with clear message

4. No input provided
- Send empty payload
- Expect 422

5. Invalid duration range
- min_duration greater than max_duration
- Expect 422

### Upstream and Reliability

6. Unknown job progress
- Open progress stream with random job id
- Expect 404

7. HF health failure
- Simulate HF base URL down
- Expect failed status with mapped upstream error

8. SSE disconnect during processing
- Simulate progress stream drop
- Job should continue
- Status polling should still show completion

9. Large ZIP handling
- Validate that ZIP is streamed to disk and download works
- Ensure process memory does not spike drastically

## Curl Examples

### Health check your backend

curl -i http://localhost:3000/health

### Start with YouTube URL

curl -i -X POST http://localhost:3000/api/reel-cutter/generate \
  -H "X-User-Id: user_test_123" \
  -H "X-User-Email: test@example.com" \
  -F "yt_url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -F "num_reels=5" \
  -F "min_duration=10" \
  -F "max_duration=30" \
  -F "resolution=720p" \
  -F "add_captions=true" \
  -F "caption_font_size=48" \
  -F "caption_color=white"

### Start with file upload

curl -i -X POST http://localhost:3000/api/reel-cutter/generate \
  -H "X-User-Id: user_test_123" \
  -H "X-User-Email: test@example.com" \
  -F "video_file=@./sample.mp4" \
  -F "num_reels=4" \
  -F "min_duration=8" \
  -F "max_duration=25"

### Status polling

curl -i http://localhost:3000/api/reel-cutter/status/REPLACE_JOB_ID

### Progress stream (SSE)

curl -N http://localhost:3000/api/reel-cutter/progress/REPLACE_JOB_ID

### Download ZIP

curl -L -o reels.zip http://localhost:3000/api/reel-cutter/download/REPLACE_JOB_ID
