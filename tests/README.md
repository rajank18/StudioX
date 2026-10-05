# 🧪 StudioX Comprehensive System Test Suite

This directory contains automated end-to-end (E2E) integration tests for the entire **StudioX** platform.

---

## 📋 What Gets Tested?

| Suite | Component / Domain | Endpoints & Features Tested |
| :--- | :--- | :--- |
| **Suite 1** | **Health & Auth** | Server availability, Clerk header parsing, `/api/users/me` user bootstrapping. |
| **Suite 2** | **Credits & Billing** | Plan catalog (`/api/billing/plans`), balance checks (`/api/billing/credits`), plan assignment (`/api/billing/plan`). |
| **Suite 3** | **Media & FFmpeg** | Silence Remover, Noise Reduction (preset & custom), Video Compressor, Video Enhancer, Video-to-GIF, Crop & Resize, Thumbnail frame extraction & typography overlay. |
| **Suite 4** | **YouTube Ingestion** | Video info extraction (`/api/video/youtube/info`), format parsing, invalid link rejection. |
| **Suite 5** | **AI Services** | Hugging Face Reel Cutter health check (`/api/reel-cutter/health`), AI Tasks queue, Subtitle & Summary guards. |
| **Suite 6** | **User Projects** | Video library listing (`/api/video/user/videos`), metadata verification. |

---

## 🚀 How to Run the Tests

### 1. Test Against Live Production Backend (Render)
```bash
# From backend directory:
cd backend
npm test

# Or directly from root:
node tests/test-runner.js --url=https://studiox-cgp7.onrender.com
```

### 2. Test Against Local Development Server (`http://localhost:3000`)
```bash
# From backend directory:
cd backend
npm run test:local

# Or directly from root:
node tests/test-runner.js --url=http://localhost:3000
```

---

## 📁 Directory Structure
```
tests/
├── fixtures/
│   └── generate-fixtures.js     # Auto-generates synthetic sample.mp4 and sample.mp3
├── suites/
│   ├── 01_health_and_auth.test.js
│   ├── 02_credits_and_billing.test.js
│   ├── 03_ffmpeg_media_tools.test.js
│   ├── 04_youtube_ingest.test.js
│   ├── 05_ai_services.test.js
│   └── 06_user_projects.test.js
├── test-runner.js               # Master test runner with CLI reporting
└── README.md
```
