# 🎬 StudioX: Complete High-Level & Deep-Dive System Architecture & Codebase Guide

> **Comprehensive Technical Blueprint & Code Walkthrough**  
> Covering Full-Stack Architecture, Database Schemas, API Endpoints, Processing Pipelines, FFmpeg Filters, AI Integrations, Background Workers, and React Component Hierarchies.

---

## 📑 Table of Contents

1. [Executive System Overview](#1-executive-system-overview)
2. [End-to-End Technology Stack](#2-end-to-end-technology-stack)
3. [System Architecture & Data Flow Architecture](#3-system-architecture--data-flow-architecture)
4. [Database & Data Modeling Deep-Dive (Prisma + PostgreSQL)](#4-database--data-modeling-deep-dive-prisma--postgresql)
5. [Authentication, Security & Rate-Limiting Subsystem](#5-authentication-security--rate-limiting-subsystem)
6. [Credit Engine, Plan Management & Background Workers](#6-credit-engine-plan-management--background-workers)
7. [Frontend Architecture & Component Tree](#7-frontend-architecture--component-tree)
8. [Comprehensive Deep-Dive of All Platform Features & Tools](#8-comprehensive-deep-dive-of-all-platform-features--tools)
   - [8.1 AI Reel Cutter](#81-ai-reel-cutter)
   - [8.2 AI Subtitle Generator](#82-ai-subtitle-generator)
   - [8.3 AI Video Summarizer](#83-ai-video-summarizer)
   - [8.4 AI Thumbnail Generator](#84-ai-thumbnail-generator)
   - [8.5 Smart Silence Remover](#85-smart-silence-remover)
   - [8.6 Audio Noise Reduction](#86-audio-noise-reduction)
   - [8.7 Smart Video Compressor](#87-smart-video-compressor)
   - [8.8 Crop & Resize Engine](#88-crop--resize-engine)
   - [8.9 Video Enhancer & AI Upscaler](#89-video-enhancer--ai-upscaler)
   - [8.10 Video-to-GIF Converter](#810-video-to-gif-converter)
   - [8.11 YouTube Downloader & Media Ingestion](#811-youtube-downloader--media-ingestion)
   - [8.12 Projects Workspace & Media Library](#812-projects-workspace--media-library)
   - [8.13 Admin Analytics & Platform Management](#813-admin-analytics--platform-management)
   - [8.14 Landing Page & Onboarding Pipeline](#814-landing-page--onboarding-pipeline)
9. [Complete API Route Directory & Payload Specifications](#9-complete-api-route-directory--payload-specifications)
10. [Directory Structure & File Manifest](#10-directory-structure--file-manifest)
11. [Deployment, Environment Configurations & Operations](#11-deployment-environment-configurations--operations)

---

## 1. Executive System Overview

**StudioX** is a unified, next-generation video creation and media processing platform designed to eliminate workflow fragmentation for creators, video editors, podcasters, marketers, and enterprises. 

Instead of juggling separate SaaS tools for video summarization, automated subtitle generation, short-form viral reel extraction, audio denoising, pause removal, aspect ratio conversion, and video compression, StudioX converges all these capabilities into a single, high-performance web studio.

### Key Capabilities Matrix

| Domain | Features | Core Engines |
| :--- | :--- | :--- |
| **Generative & Short-Form AI** | AI Reel Cutter, AI Subtitle Generator, AI Video Summarizer, AI Thumbnail Generator | AssemblyAI, OpenAI Whisper, OpenRouter (Nemotron 120B / GPT), Hugging Face Spaces |
| **Media Engineering & FFmpeg** | Silence Remover, Noise Reduction, Video Compressor, Crop & Resize, Video Enhancer, Video-to-GIF | `fluent-ffmpeg`, `ffmpeg-static`, `ffprobe-static`, `sharp`, `yt-dlp-exec` |
| **Platform & Commerce** | Clerk Auth, Tiered Credit Subscriptions, Usage Guards, Background Cron Jobs, Admin Dashboard | PostgreSQL, Prisma ORM, Redis Cache, `node-cron` |

---

## 2. End-to-End Technology Stack

```mermaid
graph TD
    subgraph Client ["Frontend (React 19 + Vite 7)"]
        UI[Tailwind CSS v4 + Framer Motion]
        ClerkClient["@clerk/clerk-react"]
        Router[React Router v7]
        Canvas[Three.js / React-Three-Fiber / HTML5 Canvas]
        CreditCtx[Credit Context & Cache]
    end

    subgraph Server ["Backend (Node.js 18+ & Express 4.21)"]
        AuthMid[Clerk Auth & User Upsert Middleware]
        UsageMid[Usage Guard & Rate Limiter]
        Controllers[Feature Controllers]
        Services[Business & Processing Services]
        CreditMgr[Credit & Plan Manager]
        CronWorkers[node-cron Background Workers]
    end

    subgraph Data ["Persistence & Cache"]
        PG[(PostgreSQL 12+)]
        PrismaORM[Prisma ORM v6.15]
        RedisCache[(Redis Cache / In-Memory)]
        FileStore[Local Storage /temp/uploads & /temp/outputs]
    end

    subgraph AI ["AI & External Services"]
        AssemblyAI[AssemblyAI Speech-to-Text]
        OpenAI[OpenAI Whisper / LLM]
        OpenRouter[OpenRouter AI Nemotron]
        HFSpace[Hugging Face Reel Cutter Space]
        YTDLP[yt-dlp Video Engine]
    end

    UI --> Router
    Router --> CreditCtx
    CreditCtx --> AuthMid
    AuthMid --> UsageMid
    UsageMid --> Controllers
    Controllers --> Services
    Services --> CreditMgr
    CreditMgr --> PrismaORM
    Services --> PrismaORM
    PrismaORM --> PG
    Controllers --> RedisCache
    Services --> YTDLP
    Services --> HFSpace
    Services --> AssemblyAI
    Services --> OpenAI
    Services --> OpenRouter
    Services --> FileStore
    CronWorkers --> PrismaORM
```

### Detailed Component Versions

* **Frontend Runtime & Framework**: React `19.2.0`, Vite `7.2.4`
* **Routing**: `react-router-dom` `^7.1.1`
* **Authentication**: `@clerk/clerk-react` `^5.21.3`
* **Styling & Icons**: Tailwind CSS `^4.1.18`, `@tailwindcss/vite`, `lucide-react` `^1.16.0`, `framer-motion` `^12.4.2`
* **Graphics & Processing**: `three` `^0.182.0`, `@react-three/fiber` `^9.0.0`, `canvas-confetti` `^1.9.4`, `gifshot` `^0.4.5`
* **Backend Runtime & Framework**: Node.js `18+` (CommonJS), Express `4.21.2`
* **Database & ORM**: PostgreSQL `12+`, Prisma ORM `@prisma/client` `^6.15.0`
* **Caching & Jobs**: Redis `ioredis` / `redis` `^4.7.0`, `node-cron` `^3.0.3`
* **Media & Audio Engines**: `fluent-ffmpeg` `^2.1.3`, `ffmpeg-static` `^5.2.0`, `ffprobe-static` `^3.1.0`, `yt-dlp-exec` `^1.0.4`, `sharp` `^0.34.5`, `form-data` `^4.0.0`, `multer` `^1.4.5-lts.1`
* **AI Provider SDKs**: `assemblyai` `^4.9.0`, `openai` `^4.85.4`, `axios` `^1.7.9`

---

## 3. System Architecture & Data Flow Architecture

StudioX implements a decoupled, event-driven client-server architecture with dedicated media-processing pipelines:

```
                                  [ Browser / Client (React 19) ]
                                                │
                                    HTTPS / WSS / REST / SSE
                                                ▼
                                [ Express 4.21 API Gateway ]
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
           [ Authentication & Guard ]                             [ Static Asset Layer ]
         • Clerk JWT Verification                               • Static File Streaming
         • User Auto-Provisioning                               • Range Byte Support (MP4/WebM)
         • Credit Validation & Deduction                        • Inline Playback Headers
         • Plan Constraint Verification                                    │
                     │                                                     │
                     ▼                                                     ▼
         [ Feature Controller Layer ]                            [ /temp Directories ]
         • Input Parsing (Multer / URLs)                        • /temp/uploads (raw)
         • Parameter Validation & Normalization                 • /temp/outputs (processed)
         • Response Serialization                               • /temp/thumbnails (frames)
                     │                                                     │
                     ▼                                                     │
         [ Core Service Engine Layer ] ────────────────────────────────────┘
         • FFmpeg Transcoding Pipeline
         • yt-dlp Extractor & Anti-Bot Bypass
         • AI Transcription (AssemblyAI / Whisper)
         • LLM Summarization (OpenRouter / OpenAI)
         • Hugging Face Spaces Video Generation (SSE Streaming)
                     │
                     ▼
         [ Persistence & Cache Layer ]
         • PostgreSQL + Prisma ORM (Users, Plans, Tasks, Logs, Outputs)
         • Redis (Response Cache, Project Lists, Credit Invalidation)
         • node-cron Workers (Monthly Resets, Task Queues)
```

---

## 4. Database & Data Modeling Deep-Dive (Prisma + PostgreSQL)

The database schema defined in `backend/prisma/schema.prisma` is optimized for relational integrity, usage tracking, auditability, and asset management.

```mermaid
erDiagram
    Plan ||--o{ User : "assigns"
    User ||--o{ UsageLog : "logs"
    User ||--o{ AiTask : "owns"
    User ||--o{ Transaction : "records"
    User ||--o{ UserOutput : "stores"

    Plan {
        String id PK "cuid()"
        String name UK "Free, Standard, Pro"
        Int monthlyCredits "100, 500, 2000"
        Boolean isUnlimited "false"
        DateTime createdAt
        DateTime updatedAt
    }

    User {
        String id PK "Clerk userId"
        String email UK
        String planId FK "nullable"
        Int currentCredits "default 0"
        DateTime creditResetAt "next reset timestamp"
        DateTime createdAt
        DateTime updatedAt
    }

    UsageLog {
        String id PK "cuid()"
        String userId FK
        String feature "e.g. ai_video, ai_subtitle"
        Int creditsUsed
        DateTime createdAt
    }

    AiTask {
        String id PK "cuid()"
        String userId FK
        String type "story_gen, subtitle, reel_cut"
        String status "pending, processing, done, failed"
        Json inputData
        Json outputData
        DateTime createdAt
        DateTime updatedAt
    }

    Transaction {
        String id PK "cuid()"
        String userId FK
        String type "credit_add, credit_use, refund, monthly_reset"
        Int amount "+500, -20"
        String description
        DateTime createdAt
    }

    UserOutput {
        String id PK "cuid()"
        String userId FK
        String title "Video title or filename"
        String originalUrl "YouTube or source URL"
        String filename "Output file name on disk"
        String filePath "Full filesystem path"
        String publicUrl "URL served via /uploads/"
        Int fileSize "File size in bytes"
        String duration "Duration string (HH:MM:SS)"
        String thumbnail "Thumbnail image URL"
        String service "youtube, reel-cutter, video-compressor, etc."
        DateTime createdAt
        DateTime updatedAt
    }
```

### Table Specifications & Index Strategy

1. **`Plan` Table**:
   - `id` (`String`, Primary Key, `cuid()`): Unique plan identifier.
   - `name` (`String`, Unique): Plan identifier (`Free`, `Standard`, `Pro`).
   - `monthlyCredits` (`Int`): Monthly allowance (Free = 100, Standard = 500, Pro = 2000).
   - `isUnlimited` (`Boolean`): Flag for enterprise/unlimited plans.
2. **`User` Table**:
   - `id` (`String`, Primary Key): Mapped directly to Clerk's `userId` (e.g., `user_2t...`).
   - `email` (`String`, Unique): User's primary email.
   - `planId` (`String?`, Foreign Key -> `Plan.id`): Associated subscription tier.
   - `currentCredits` (`Int`): Current spendable credit balance.
   - `creditResetAt` (`DateTime?`): ISO timestamp when the next monthly credit renewal will execute.
3. **`UsageLog` Table**:
   - Stores granular event logs whenever a credit-consuming feature is executed.
4. **`AiTask` Table**:
   - Tracks long-running background tasks, task payloads (`inputData`), and serialized outputs (`outputData`).
5. **`Transaction` Table**:
   - Implements double-entry ledger tracking for all credit alterations (`credit_add`, `credit_use`, `refund`, `monthly_reset`).
6. **`UserOutput` Table**:
   - Central repository of all user artifacts generated across tools (`youtube`, `reel-cutter`, `video-to-gif`, `crop-resize`, `noise-reduction`, `video-enhancer`, `video-compressor`, `ai-subtitle`, `ai-summary`).

---

## 5. Authentication, Security & Rate-Limiting Subsystem

### 5.1 Clerk Auth & Middleware Pipeline (`clerkAuth.js`)

StudioX employs a resilient dual-layer authentication strategy:
1. **Primary**: Clerk JSON Web Tokens (JWT) passed in the `Authorization: Bearer <token>` header, verified against Clerk's backend SDK.
2. **Fallback / Secondary**: Header-based authentication (`X-User-Id`, `X-User-Email`) for internal tooling, background hooks, and cross-origin clients.
3. **`ensureUserExists` Middleware**:
   - Checks if the user exists in PostgreSQL.
   - If not found, automatically provisions the user record with the `Free` plan (100 credits) and computes `creditResetAt` = `now() + 30 days`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Express as Express Middleware
    participant Clerk as Clerk SDK
    participant DB as PostgreSQL (Prisma)

    User->>Express: HTTP Request with Bearer Token & X-User-Id
    Express->>Clerk: Validate Clerk Session Token
    alt Token Valid
        Clerk-->>Express: Returns auth context (userId, sessionClaims)
    else Fallback to Headers
        Express->>Express: Extract userId from X-User-Id header
    end
    Express->>DB: User.findUnique({ where: { id: userId } })
    alt User Not Found
        Express->>DB: User.create({ id, email, plan: 'Free', credits: 100, creditResetAt: +30d })
    end
    Express->>Express: Attach req.userId, req.user to Request
    Express->>Controllers: Proceed to Feature Controller
```

### 5.2 Rate Limiting & Usage Guards (`usageGuard.js`)

To protect server resources and prevent abuse of CPU-heavy media transformations and external AI APIs:
* **AI Info Rate Limiter**: 30 requests per minute per IP / User.
* **AI Generation Rate Limiter**: 10 heavy generation runs per minute per IP / User.
* **CORS Security (`app.js`)**: Dynamic origin parser supporting localhost environments (`http://localhost:5173`) and wildcard production domains (`https://*.studiox.app`, `https://*.vercel.app`).
* **Static File Protection & Streaming Headers**: Video assets served with `Accept-Ranges: bytes` and `Content-Disposition: inline` to enable instant browser seek operations without downloading whole files.

---

## 6. Credit Engine, Plan Management & Background Workers

### 6.1 Credit Policy & Costs (`creditPolicy.js`)

Credit costs per feature execution:

| Feature Key | Operation | Credit Cost | Notes |
| :--- | :--- | :--- | :--- |
| `ai-video-summary` | Summarize YouTube / Uploaded Video | **5 Credits** | Covers transcription + LLM summary |
| `ai-subtitle-generator` | Generate & Burn Subtitles | **20 Credits** | Covers AssemblyAI speech-to-text + FFmpeg render |
| `reel-cutter` (Base) | Clip Long Video into Shorts | **20 Credits** | Viral clip detection + crop |
| `reel-cutter` (Captions) | Reel Cutter with Burned Captions | **+5 Credits (25 total)** | Additional transcription burn-in |
| All Media Utilities | Compress, Denoise, Silence, GIF, Crop, Enhance | **0 Credits (Free)** | CPU-bound server utilities |

### 6.2 Plan Constraints & File Limits (`featureConstraints.js`)

Tiered resource guards prevent memory exhaustion:

| Plan | Monthly Credits | AI Summary Max | AI Subtitles Max | Reel Cutter Max | Max Upload File Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | 100 credits | 30 mins | 20 mins | 25 mins | 200 MB – 300 MB |
| **Standard** | 500 credits | 90 mins | 60 mins | 90 mins | 500 MB – 700 MB |
| **Pro** | 2000 credits | 4 hours | 3 hours | 4 hours | 1024 MB (1 GB) |

### 6.3 Credit Execution Flow & Safe Auto-Refunds (`creditManager.js`)

Whenever an AI feature is invoked:
1. `hasEnoughCredits(userId, cost)` checks the user's balance.
2. If sufficient, `useCredits(userId, cost, feature)` decrements credits in a transaction, creates a `UsageLog`, and adds a `-cost` `Transaction`.
3. If processing subsequently fails (e.g., third-party API outage, malformed video), the controller triggers `refundSafely(userId, cost, reason)` to increment credits back and log a refund.
4. **Credit Exemption**: Emails defined in `CREDIT_EXCEPTION_EMAILS` bypass credit deductions while continuing to log usage for analytics.

### 6.4 Automated Background Cron Jobs (`monthlyCreditReset.js`)

1. **Monthly Credit Renewal Worker (`0 2 * * *`)**:
   - Executes daily at **2:00 AM UTC**.
   - Queries users where `creditResetAt <= now()`.
   - Resets `currentCredits` to the plan's quota (100 for Free, 500 for Standard, 2000 for Pro).
   - Sets next `creditResetAt = now() + 30 days` and logs a `monthly_reset` transaction.
2. **Task Processing Worker (`* * * * *`)**:
   - Runs every **60 seconds** to poll pending `AiTask` items and transition them to `processing`.

---

## 7. Frontend Architecture & Component Tree

The frontend is built on **React 19** and **Vite 7**, utilizing a responsive layout with dark/light theme switching, responsive sidebar, real-time credit context, and tool workflows.

```mermaid
graph TD
    App[App.jsx] --> Router[BrowserRouter]
    Router --> Nav[Navigation.jsx]
    Nav --> WebRoutes[WebRoutes.jsx]
    Nav --> AuthRoutes[AuthRoutes.jsx]

    WebRoutes --> Landing[LandingPage.jsx]
    WebRoutes --> Onboarding[OnBoarding.jsx]
    WebRoutes --> WebLayout[WebLayout.jsx]

    WebLayout --> CreditProvider[CreditContext.jsx Provider]
    CreditProvider --> Sidebar[Sidebar.jsx]
    CreditProvider --> MainOutlet[React Router Outlet]

    MainOutlet --> Home[Home.jsx Dashboard]
    MainOutlet --> Projects[Projects.jsx Media Workspace]
    MainOutlet --> ToolsCatalog[Tools.jsx Catalog]
    MainOutlet --> ReelCutter[AiReelCutter.jsx]
    MainOutlet --> Subtitles[AiSubtitleGenerator.jsx]
    MainOutlet --> Summary[AiVideoSummary.jsx]
    MainOutlet --> Thumbnails[ThumbnailGenerator.jsx]
    MainOutlet --> Silence[RemoveSilence.jsx]
    MainOutlet --> Denoise[NoiseReduction.jsx]
    MainOutlet --> Compress[VideoCompressor.jsx]
    MainOutlet --> Crop[CropResize.jsx]
    MainOutlet --> Enhance[VideoEnhancer.jsx]
    MainOutlet --> Gif[VideoToGif.jsx]
    MainOutlet --> YTDownloader[YtDownloader.jsx]
```

### Global State Management & Providers

* **`CreditContext.jsx`**: Provides `credits`, `isLoadingCredits`, and `refreshCredits()` to all protected views. Employs local storage caching with key `studiox-credit-cache:<userId>` for zero-latency UI rendering during network requests.
* **Theme System (`studiox-theme`)**: Broadcasts `CustomEvent('studiox-theme-change')` across components to dynamically toggle between dark and light themes without requiring heavy context re-renders.

---

## 8. Comprehensive Deep-Dive of All Platform Features & Tools

---

### 8.1 AI Reel Cutter

**Files**:
* Frontend: `frontend/src/pages/web/AiReelCutter.jsx`, `frontend/src/lib/useReelCutterJob.js`
* Backend: `backend/src/routes/reelCutterRoutes.js`, `backend/src/controllers/reelCutterController.js`, `backend/src/services/hfReelCutterService.js`

```mermaid
sequenceDiagram
    autonumber
    actor Creator as User
    participant Web as AiReelCutter.jsx
    participant API as reelCutterController.js
    participant HF as Hugging Face Space (FastAPI)
    participant Disk as Temp Storage (/temp/outputs)
    participant DB as PostgreSQL

    Creator->>Web: Submit YouTube URL / Upload Video + Set Options
    Web->>API: POST /api/reel-cutter/create (Form-Data)
    API->>API: Deduct 20 credits (+5 for captions)
    API->>HF: POST /api/generate-zip-stream (Multipart/Streaming)
    API-->>Web: Returns { jobId }
    Web->>API: SSE GET /api/reel-cutter/progress/:jobId
    HF-->>API: SSE Progress Events (Transcribing, Finding Highlights, Cropping 9:16)
    API-->>Web: Forward SSE Progress (pct, stage, status)
    HF-->>API: Streams Output ZIP File
    API->>Disk: Write ZIP to /temp/outputs/:jobId.zip
    API->>Disk: Extract individual MP4 reels
    API->>DB: UserOutput.create() for each extracted reel
    API-->>Web: SSE Event 'completed' with array of public reel URLs
    Web->>Creator: Render Interactive Video Gallery + Download Buttons
```

#### Detailed Workflow & Technical Implementation:
1. **Input & Options Normalization**: Accepts either a YouTube URL or direct file upload. Configurable options: `num_reels` (1-20), `min_duration` (5-180s), `max_duration` (5-300s), `resolution` (`720p` or `1080p`), `add_captions` (boolean), `caption_font_size`, and `caption_color`.
2. **Upstream Hugging Face Space Integration**: Connects to the remote AI Reel Cutter space (`rajan18-studiox-reel-cutter.hf.space`) using Axios streaming pipelines.
3. **Resilient SSE & Fallback Polling (`useReelCutterJob.js`)**:
   - Establishes an `EventSource` connection to `/api/reel-cutter/progress/:jobId`.
   - If SSE drops or errors more than 3 times, gracefully falls back to polling `/api/reel-cutter/status/:jobId` every 1500ms.
4. **Archive Decompression & Asset Persistence**: Unpacks generated `.zip` archives into `/temp/outputs`, inspects individual reel durations and metadata, and creates database records in `UserOutput` under the `reel-cutter` service.

---

### 8.2 AI Subtitle Generator

**Files**:
* Frontend: `frontend/src/pages/web/AiSubtitleGenerator.jsx`
* Backend: `backend/src/routes/aiSubtitleRoutes.js`, `backend/src/controllers/aiSubtitleController.js`, `backend/src/services/aiSubtitleService.js`

```mermaid
graph TD
    A[Input Video: YouTube / Local File] --> B[Probe Video & Check Credits 20]
    B --> C[Extract Audio as 16kHz Mono MP3 via FFmpeg]
    C --> D[Send Audio to AssemblyAI Transcription API]
    D --> E[Receive Word-Level & Utterance Timestamps]
    E --> F[Generate Clean SRT File with formatSrtTimestamp]
    F --> G[Run FFmpeg Subtitle Burning Filter: subtitles=file.srt]
    G --> H[Export Subtitled MP4 with +faststart]
    H --> I[Save UserOutput Record & Return Video + SRT Download]
```

#### Detailed Workflow & Technical Implementation:
1. **Audio Extraction Filter**:
   ```bash
   ffmpeg -i input.mp4 -vn -acodec libmp3lame -ar 16000 -ac 1 -ab 64k temp_audio.mp3
   ```
2. **AssemblyAI Word-Level Timestamp Parsing**:
   - Computes utterances or 10-word chunks capped at 2500ms duration for readable subtitle rhythm.
   - Formats millisecond timestamps into standard SubRip (`00:01:23,456 --> 00:01:26,789`).
3. **FFmpeg Subtitle Burn Filter**:
   - Escapes special characters (`\`, `:`, `,`, `'`) in the subtitle path to prevent FFmpeg filter syntax collisions:
   ```bash
   ffmpeg -i input.mp4 -vf "subtitles=escaped_path.srt:force_style='FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=25'" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k -movflags +faststart output.mp4
   ```

---

### 8.3 AI Video Summarizer

**Files**:
* Frontend: `frontend/src/pages/web/AiVideoSummary.jsx`
* Backend: `backend/src/routes/aiVideoSummaryRoutes.js`, `backend/src/controllers/aiVideoSummaryController.js`, `backend/src/services/aiVideoSummaryService.js`

```mermaid
graph TD
    In[YouTube URL / Uploaded Video] --> Auth[Verify Credits: 5 Credits]
    Auth --> Audio[Extract Audio via yt-dlp / FFmpeg]
    Audio --> Transcribe[Transcribe Audio: OpenAI Whisper or AssemblyAI]
    Transcribe --> LLM[OpenRouter Nemotron 120B / OpenAI LLM]
    LLM --> JSON[Parse Structured JSON Response]
    JSON --> UI[Render Overview, Key Takeaways, Action Items, Timestamped Chapters]
```

#### Detailed Workflow & Technical Implementation:
1. **Multi-Tier Audio Ingestion**:
   - For YouTube: Runs `yt-dlp` with multi-strategy fallbacks (`android,web` clients) to bypass bot challenge gates.
   - For Uploads: Extracts low-bitrate mono MP3 (`16kHz`, `64kbps`) to keep transcriptions fast.
2. **Dual-Provider Speech-to-Text**:
   - Primary: OpenAI Whisper (`whisper-1`) or AssemblyAI SDK.
3. **Structured Summary Generation (OpenRouter / OpenAI)**:
   - Utilizes `nvidia/nemotron-3-super-120b-a12b:free` or OpenAI models with strict JSON schema instructions:
   ```json
   {
     "overview": "Comprehensive executive summary of the content...",
     "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
     "actionItems": ["Action 1", "Action 2"],
     "chapters": [
       { "timestamp": "00:00", "title": "Introduction" },
       { "timestamp": "04:15", "title": "Core Methodology" }
     ]
   }
   ```
4. **Interactive UI**: Users can click timestamped chapters to seek to specific sections in the video player.

---

### 8.4 AI Thumbnail Generator

**Files**:
* Frontend: `frontend/src/pages/web/ThumbnailGenerator.jsx`
* Backend: `backend/src/routes/thumbnailRoutes.js`, `backend/src/controllers/thumbnailController.js`, `backend/src/services/thumbnailService.js`

#### Detailed Workflow & Technical Implementation:
1. **Intelligent Frame Extraction**:
   - Measures total video duration with `ffprobe`.
   - Divides duration into equal time slices: `interval = duration / (frameCount + 1)`.
   - Extracts 10 high-resolution JPEG frames across the video timeline (`scale=1280:-1`, `-q:v 2`).
2. **Heuristic Quality Scoring**:
   - Analyzes frame file sizes and image entropy as a proxy for visual detail, sorting sharper frames to the top.
3. **Dynamic Canvas & FFmpeg Text Styler**:
   - Allows users to overlay custom typography with controls for font size (24-96px), font family, background pill opacity, textColor, and custom X/Y positioning.

---

### 8.5 Smart Silence Remover

**Files**:
* Frontend: `frontend/src/pages/web/RemoveSilence.jsx`
* Backend: `backend/src/routes/silenceRemoverRoutes.js`, `backend/src/controllers/silenceRemoverController.js`, `backend/src/services/silenceRemoverService.js`

#### Detailed Workflow & Technical Implementation:
1. **Acoustic Pause Detection**:
   - Employs FFmpeg's `silenceremove` filter with calibrated sensitivity parameters:
   ```bash
   silenceremove=start_periods=2:start_duration=0.5:start_threshold=-40dB:stop_periods=2:stop_duration=0.5:stop_threshold=-40dB,aformat=sample_rates=44100
   ```
2. **Audio Stream Reconstruction**:
   - Re-encodes cleaned audio streams with `libmp3lame` at `128kbps` / `44.1kHz`.
3. **Metrics Calculation**:
   - Compares raw audio size vs. processed audio size to calculate the exact percentage of dead air removed (`% Silence Removed`).

---

### 8.6 Audio Noise Reduction

**Files**:
* Frontend: `frontend/src/pages/web/NoiseReduction.jsx`
* Backend: `backend/src/routes/noiseReductionRoutes.js`, `backend/src/controllers/noiseReductionController.js`, `backend/src/services/noiseReductionService.js`

#### Detailed Workflow & Technical Implementation:
1. **Multi-Stage Acoustic Filtering**:
   - High-pass filtering (`highpass=f=200`) to strip out low-frequency microphone rumble and AC hum.
   - Low-pass filtering (`lowpass=f=3000`) to attenuate high-frequency hiss, static, and ambient fan noise.
2. **Engineered Presets**:
   - `Light` (40% noise reduction, 40% voice enhancement)
   - `Balanced` (70% noise reduction, 70% voice enhancement)
   - `Aggressive` (90% noise reduction, 90% voice enhancement)
   - `Speech` (75% noise reduction, 85% voice enhancement)
   - `Podcast` (80% noise reduction, 80% voice enhancement)
3. **Lossless Video Remuxing**:
   - Video track is copied losslessly (`-c:v copy`), while the filtered audio stream is re-encoded to high-fidelity AAC (`128kbps`), preserving 100% of original visual quality.

---

### 8.7 Smart Video Compressor

**Files**:
* Frontend: `frontend/src/pages/web/VideoCompressor.jsx`
* Backend: `backend/src/routes/videoCompressorRoutes.js`, `backend/src/controllers/videoCompressorController.js`, `backend/src/services/videoCompressorService.js`

```mermaid
graph TD
    Start[Input Video Upload] --> Probe[Probe Bitrate, Dimensions & Duration via ffprobe]
    Probe --> Target[Calculate Target Bitrate = Source * (1 - Compression%)]
    Target --> Strategy[Select Strategy: Quality / Balanced / Size Priority]
    Strategy --> Pass1[Encode Attempt 1: 100% Target Bitrate]
    Pass1 --> Check1{Output < Input?}
    Check1 -- Yes --> Success[Save Output & Return Metrics]
    Check1 -- No --> Pass2[Encode Attempt 2: 80% Bitrate Scale]
    Pass2 --> Check2{Output < Input?}
    Check2 -- Yes --> Success
    Check2 -- No --> Pass3[Encode Attempt 3: 62% Bitrate Scale]
    Pass3 --> Check3{Output < Input?}
    Check3 -- Yes --> Success
    Check3 -- No --> Safety[Safety Fallback: Preserve Original Video]
```

#### Detailed Workflow & Technical Implementation:
1. **Dual-Constraint Compression Algorithm**:
   - Combines Constant Rate Factor (`-crf`) as a quality floor with `-maxrate` and `-bufsize` (VBV buffer) as strict bitrate ceilings.
   - Implements x264 psychovisual parameters:
   ```bash
   -x264-params aq-mode=3:aq-strength=0.8:mbtree=1:rc-lookahead=40
   ```
2. **Resolution Ladder Downscaling**:
   - Quality Priority (30-45%): Preserves full native resolution.
   - Balanced (46-70%): Automatically downscales to maximum 1080p (`scale=-2:1080`).
   - Size Priority (71-90%): Downscales to 720p (`scale=-2:720`).
3. **Zero-Degradation Safety Net**:
   - If after 3 encode iterations the file size is not smaller than the original input, the original is retained and returned to prevent file bloat.

---

### 8.8 Crop & Resize Engine

**Files**:
* Frontend: `frontend/src/pages/web/CropResize.jsx`, `frontend/src/components/web/CropResizeFrame.jsx`, `frontend/src/components/web/CropResizeTimeline.jsx`
* Backend: `backend/src/routes/cropResizeRoutes.js`, `backend/src/controllers/cropResizeController.js`, `backend/src/services/cropResizeService.js`

#### Detailed Workflow & Technical Implementation:
1. **Interactive Visual Crop Frame**:
   - Provides draggable, resizable crop bounding boxes on top of the live HTML5 video player.
   - Aspect ratio presets: `16:9` (YouTube/Landscape), `9:16` (Shorts/TikTok/Reels), `1:1` (Instagram Square), `4:5` (Social Portrait), and `Freeform`.
2. **Timeline Trimming**:
   - Dual-handle range slider allows sub-second precision start (`startTime`) and end (`endTime`) trimming.
3. **FFmpeg Video Filter Graph**:
   ```bash
   ffmpeg -ss {startTime} -i input.mp4 -t {duration} -vf "crop={w}:{h}:{x}:{y},scale={outW}:{outH}:force_original_aspect_ratio=decrease" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
   ```

---

### 8.9 Video Enhancer & AI Upscaler

**Files**:
* Frontend: `frontend/src/pages/web/VideoEnhancer.jsx`
* Backend: `backend/src/routes/videoEnhancementRoutes.js`, `backend/src/controllers/videoEnhancementController.js`, `backend/src/services/videoEnhancementService.js`

#### Detailed Workflow & Technical Implementation:
1. **Multi-Tier Enhancement Profiles**:
   - **Light**: Bilinear 2x scale (capped at 2048px width) + subtle color vibrance:
     ```bash
     scale='min(iw*2,2048)':-2:flags=bilinear,eq=saturation=1.08:contrast=1.04:brightness=0.01
     ```
   - **Medium**: Bicubic 2x scale + unsharp masking + color polish:
     ```bash
     scale='min(iw*2,2048)':-2:flags=bicubic,unsharp=3:3:0.5:3:3:0.0,eq=saturation=1.10:contrast=1.06:brightness=0.01
     ```
   - **Heavy**: Spatial denoiser (`hqdn3d`) + Lanczos interpolation + aggressive sharpening:
     ```bash
     hqdn3d=1.5:1.5:6:6,scale='min(iw*2,2048)':-2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0,eq=saturation=1.15:contrast=1.08:brightness=0.02
     ```
2. **Optional 60 FPS Frame Rate Smoothing**: Adds `fps=60` filter for silky motion playback.

---

### 8.10 Video-to-GIF Converter

**Files**:
* Frontend: `frontend/src/pages/web/VideoToGif.jsx`
* Backend: `backend/src/routes/videoToGifRoutes.js`, `backend/src/controllers/videoToGifController.js`, `backend/src/services/videoToGifService.js`

#### Detailed Workflow & Technical Implementation:
1. **Two-Pass Palette Generation**:
   - Prevents GIF color banding and dithering artifacts by generating a custom 256-color palette from the video stream:
   - **Pass 1**:
     ```bash
     ffmpeg -ss {start} -t {dur} -i input.mp4 -vf "fps=10,scale={width}:-1:flags=lanczos,palettegen" palette.png
     ```
   - **Pass 2**:
     ```bash
     ffmpeg -ss {start} -t {dur} -i input.mp4 -i palette.png -lavfi "fps=10,scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
     ```
2. **Client-Side Generation Option**: Includes Web Worker fallback (`gif.worker.js`) for local client-side processing without uploading raw files.

---

### 8.11 YouTube Downloader & Media Ingestion

**Files**:
* Frontend: `frontend/src/pages/web/YtDownloader.jsx`
* Backend: `backend/src/routes/videoRoutes.js`, `backend/src/controllers/youtubeController.js`, `backend/src/services/youtubeService.js`, `backend/src/utils/youtubeAuth.js`

#### Detailed Workflow & Technical Implementation:
1. **Anti-Bot Bypass & Player Emulation**:
   - Passes `youtube:player_client=android,web;youtube:skip=ads,hls,dash` extractor flags to avoid sign-in verification challenges.
   - Supports custom Netscape cookie injection via `YTDLP_COOKIES_B64` or `YTDLP_COOKIES_FILE`.
2. **Adaptive Stream Merging**:
   - Queries available video/audio streams and merges separate high-resolution video + audio tracks into a unified MP4 container.
3. **Free Tier Quota Management**:
   - Enforces a 5-video active project limit on the Free plan, pruning the oldest outputs automatically when new downloads complete.

---

### 8.12 Projects Workspace & Media Library

**Files**:
* Frontend: `frontend/src/pages/web/Projects.jsx`
* Backend: `backend/src/routes/videoRoutes.js` (`/api/video/user/videos`)

#### Detailed Workflow & Technical Implementation:
1. **Centralized User Asset Hub**:
   - Fetches and renders all user outputs across all tools (`youtube`, `reel-cutter`, `video-to-gif`, `crop-resize`, `noise-reduction`, `video-enhancer`, `video-compressor`).
2. **Interactive Preview & Direct Downloads**:
   - In-app video/GIF preview modal.
   - Direct download trigger using Blob object URLs.
   - Single-item and bulk "Delete All" operations with automated filesystem cleanup.

---

### 8.13 Admin Analytics & Platform Management

**Files**:
* Backend: `backend/src/routes/adminRoutes.js`, `backend/src/controllers/adminController.js`, `backend/src/services/adminService.js`, `backend/src/middleware/adminAuth.js`

#### Detailed Workflow & Technical Implementation:
1. **Admin Authentication**: Header-based `x-admin-key` validation against `ADMIN_SECRET_KEY`.
2. **Comprehensive Metric Aggregation**:
   - Total user registrations, aggregate credit supply, and 30-day consumption trends.
   - Total disk storage consumed by user outputs (`outputStorageBytes`).
   - Distribution breakdowns: Plan tiers (`Free`, `Standard`, `Pro`), Tool utilization (`service`), and Task completion rates.
   - Live inspection table of the latest 100 users with their active plans, credit balances, and tool activity logs.

---

### 8.14 Landing Page & Onboarding Pipeline

**Files**:
* Frontend: `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/OnBoarding.jsx`, `frontend/src/components/web/Navbar.jsx`, `frontend/src/components/web/Footer.jsx`

#### Detailed Workflow & Technical Implementation:
1. **Dynamic Landing Page**:
   - Feature showcases with animated cards powered by Framer Motion.
   - Live pricing comparison matrix.
   - Three.js animated background silk canvas (`Silk.jsx`).
2. **3-Step Personalization Onboarding**:
   - **Step 1: Profile & Identity** (User type: Creator, Business, Voice Actor, Engineer, etc.).
   - **Step 2: Interests & Goals** (Audiobooks, Podcasts, Dubbing, Reels, Summaries).
   - **Step 3: Plan Selection** (Free, Standard, Pro) with seamless redirection to Clerk sign-up.

---

## 9. Complete API Route Directory & Payload Specifications

| HTTP Method | Route Endpoint | Middleware / Auth | Request Body / Params | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | None (Public) | None | Returns `{ status: 'ok', timestamp }` |
| `GET` | `/download/:filename` | None (Public) | Route param `filename` | Forces binary download of processed asset |
| `GET` | `/uploads/*` | Static | None | Inline streaming of MP4/GIF assets with Byte-Range support |
| `GET` | `/thumbnails/*` | Static | None | Static JPEG frame serving |
| **Users** | | | | |
| `GET` | `/api/users/me` | Clerk Auth | None | Fetches or creates current user profile |
| `GET` | `/api/users/credits` | Clerk Auth | None | Returns `{ credits: { current, plan, isUnlimited } }` |
| `GET` | `/api/users/transactions` | Clerk Auth | Query `limit` | Returns user's credit ledger history |
| `POST`| `/api/users/upgrade-plan` | Clerk Auth | `{ planName: 'Standard'\|'Pro' }` | Upgrades user plan and assigns new credit quota |
| **AI Reel Cutter** | | | | |
| `POST`| `/api/reel-cutter/create` | Clerk Auth + Usage Guard | `multipart/form-data` (`video_file` or `yt_url`, options) | Initiates reel extraction job; returns `{ jobId }` |
| `GET` | `/api/reel-cutter/progress/:jobId` | Public / Session | Route param `jobId` | Server-Sent Events (SSE) progress stream |
| `GET` | `/api/reel-cutter/status/:jobId` | Public / Session | Route param `jobId` | JSON polling endpoint for job status |
| `GET` | `/api/reel-cutter/download/:jobId` | Public / Session | Route param `jobId` | Downloads raw ZIP archive of generated reels |
| **AI Subtitles** | | | | |
| `POST`| `/api/ai-subtitle/youtube/info` | Clerk Auth + Rate Limit | `{ url }` | Fetches YouTube video metadata & duration |
| `POST`| `/api/ai-subtitle/youtube/generate` | Clerk Auth + Credit Guard | `{ url }` | Generates subtitles and returns burned MP4 |
| `POST`| `/api/ai-subtitle/upload/info` | Clerk Auth + Multer | `multipart/form-data` (`video`) | Probes uploaded video file |
| `POST`| `/api/ai-subtitle/upload/generate` | Clerk Auth + Credit Guard | `multipart/form-data` (`video`) | Transcribes uploaded video and returns burned MP4 |
| **AI Video Summary** | | | | |
| `POST`| `/api/ai-video-summary/youtube/info` | Clerk Auth + Rate Limit | `{ url }` | Fetches YouTube video info |
| `POST`| `/api/ai-video-summary/youtube` | Clerk Auth + Credit Guard | `{ url }` | Generates structured JSON summary & chapters |
| `POST`| `/api/ai-video-summary/upload/info` | Clerk Auth + Multer | `multipart/form-data` (`video`) | Probes uploaded video file |
| `POST`| `/api/ai-video-summary/upload` | Clerk Auth + Credit Guard | `multipart/form-data` (`video`) | Transcribes & summarizes uploaded video |
| **Thumbnail Generator** | | | | |
| `POST`| `/api/thumbnail/extract` | Multer | `multipart/form-data` (`video`, `frameCount`) | Extracts high-res candidate frames |
| `POST`| `/api/thumbnail/add-text` | Clerk Auth | `{ framePath, text, options }` | Renders text overlay onto selected frame |
| **Silence Remover** | | | | |
| `POST`| `/api/remove-silence` | Multer | `multipart/form-data` (`audio`) | Strips dead air from audio/video |
| `GET` | `/api/silence-remover/tasks` | Clerk Auth | None | Lists user's silence removal tasks |
| **Noise Reduction** | | | | |
| `GET` | `/api/noise-reduction/presets` | Public | None | Returns list of noise reduction presets |
| `POST`| `/api/noise-reduction/preset` | Multer | `multipart/form-data` (`video`, `preset`) | Applies preset audio filter |
| `POST`| `/api/noise-reduction/custom` | Multer | `multipart/form-data` (`video`, `noiseReduction`, `voiceEnhancement`) | Applies custom audio filter |
| **Video Compressor** | | | | |
| `POST`| `/api/video-compressor/analyze`| Multer | `multipart/form-data` (`video`) | Probes video bitrate & resolution |
| `POST`| `/api/video-compressor/process`| Express JSON | `{ inputPath, compressionPercent }` | Executes dual-constraint compression |
| `GET` | `/api/video-compressor/progress/:jobId` | Public | Route param `jobId` | Queries compression progress |
| **Crop & Resize** | | | | |
| `POST`| `/api/crop-resize/probe` | Multer | `multipart/form-data` (`video`) | Returns video duration, width, height |
| `POST`| `/api/crop-resize/process` | Multer | `multipart/form-data` (`video`, `startTime`, `endTime`, `cropX`, `cropY`, `cropWidth`, `cropHeight`) | Crops and trims video |
| **Video Enhancer** | | | | |
| `POST`| `/api/video-enhancement/process` | Multer | `multipart/form-data` (`video`, `mode`, `enableFpsSmooth`) | Upscales and enhances video quality |
| **Video to GIF** | | | | |
| `POST`| `/api/video/to-gif` | Multer | `multipart/form-data` (`video`, `startTime`, `duration`, `gifWidth`) | Generates two-pass optimized GIF |
| **YouTube Downloader & Projects** | | | | |
| `POST`| `/api/video/youtube/info` | Public | `{ url }` | Probes YouTube streams & formats |
| `POST`| `/api/video/youtube/download` | Clerk Auth | `{ url, quality, format }` | Downloads video to server |
| `GET` | `/api/video/user/videos` | Clerk Auth | None | Lists all saved projects and outputs |
| `DELETE`| `/api/video/user/videos/:id` | Clerk Auth | Route param `id` | Deletes specific output and cleans disk |
| `DELETE`| `/api/video/user/videos/all` | Clerk Auth | None | Clears all user projects |
| **Admin** | | | | |
| `GET` | `/api/admin/dashboard` | Admin Auth (`x-admin-key`) | Query `limit` | Returns complete platform analytics & user list |

---

## 10. Directory Structure & File Manifest

```
StudioX/
├── backend/
│   ├── prisma/
│   │   ├── migrations/               # PostgreSQL schema migrations
│   │   └── schema.prisma             # Primary Prisma ORM model definitions
│   ├── src/
│   │   ├── config/
│   │   │   ├── creditPolicy.js       # Plan pricing, monthly quotas & credit costs
│   │   │   ├── prisma.js             # Singleton Prisma database client
│   │   │   └── redis.js              # Redis cache connection & helpers
│   │   ├── controllers/
│   │   │   ├── adminController.js    # Admin analytics request handler
│   │   │   ├── aiSubtitleController.js # Subtitle extraction & render handler
│   │   │   ├── aiTaskController.js   # Background task status handler
│   │   │   ├── aiVideoSummaryController.js # Video summary request handler
│   │   │   ├── billingController.js  # Plan upgrade & billing handler
│   │   │   ├── cropResizeController.js # Aspect crop & trim handler
│   │   │   ├── noiseReductionController.js # Audio denoising handler
│   │   │   ├── reelCutterController.js # Viral reel extraction & SSE handler
│   │   │   ├── silenceRemoverController.js # Dead air stripping handler
│   │   │   ├── thumbnailController.js # Frame extraction & typography handler
│   │   │   ├── userController.js     # User profile & credit balance handler
│   │   │   ├── videoCompressorController.js # Smart compression handler
│   │   │   ├── videoEnhancementController.js # Video upscaling handler
│   │   │   ├── videoToGifController.js # GIF conversion handler
│   │   │   └── youtubeController.js  # YouTube ingestion & project handler
│   │   ├── middleware/
│   │   │   ├── adminAuth.js          # Admin secret key validation
│   │   │   ├── auth.js               # Bearer token extractor
│   │   │   ├── clerkAuth.js          # Clerk JWT verification & user upsert
│   │   │   ├── errorHandler.js       # Global async error handling
│   │   │   ├── requireCredits.js     # Credit check middleware
│   │   │   └── usageGuard.js         # Rate-limiting guards
│   │   ├── routes/                   # Express router definitions for each module
│   │   ├── services/
│   │   │   ├── adminService.js       # Database analytics aggregator
│   │   │   ├── aiSubtitleService.js  # AssemblyAI transcription & SRT burner
│   │   │   ├── aiVideoSummaryService.js # Whisper/AssemblyAI + LLM summarizer
│   │   │   ├── creditService.js      # Credit transaction service
│   │   │   ├── cropResizeService.js  # FFmpeg crop & scale service
│   │   │   ├── hfReelCutterService.js # Hugging Face Space client & SSE pipe
│   │   │   ├── noiseReductionService.js # Multi-stage audio filter service
│   │   │   ├── silenceRemoverService.js # silenceremove audio filter service
│   │   │   ├── taskService.js        # AI Task management service
│   │   │   ├── thumbnailService.js   # Frame extraction & text overlay service
│   │   │   ├── userService.js        # User database operations
│   │   │   ├── videoCompressorService.js # Dual-constraint encoder engine
│   │   │   ├── videoEnhancementService.js # Upscale & color correction service
│   │   │   ├── videoToGifService.js  # Two-pass palette GIF service
│   │   │   └── youtubeService.js     # yt-dlp downloading & format selector
│   │   ├── temp/                     # Ephemeral file staging
│   │   │   ├── uploads/              # Raw incoming video/audio uploads
│   │   │   ├── outputs/              # Processed media ready for streaming
│   │   │   └── thumbnails/           # Extracted candidate thumbnail frames
│   │   ├── utils/
│   │   │   ├── creditCache.js        # Redis credit invalidator
│   │   │   ├── creditManager.js      # Credit check, deduction & refund logic
│   │   │   ├── featureConstraints.js # Plan-based duration and size guards
│   │   │   ├── logger.js             # Formatted console logger
│   │   │   ├── planManager.js        # Plan tiers and renewal calculations
│   │   │   └── youtubeAuth.js        # Netscape cookie parser for yt-dlp
│   │   ├── workers/
│   │   │   └── monthlyCreditReset.js # node-cron daily renewal & task workers
│   │   ├── app.js                    # Express application setup, CORS & routes
│   │   └── server.js                 # HTTP server bootstrap & worker startup
│   └── package.json
│
├── frontend/
│   ├── public/                       # Static public assets & web workers
│   │   └── gif.worker.js             # Client-side GIF worker
│   ├── src/
│   │   ├── assets/                   # Logos, vectors, and brand imagery
│   │   ├── components/
│   │   │   ├── Silk.jsx              # Three.js interactive animated landing background
│   │   │   └── web/
│   │   │       ├── CreditStatusCard.jsx # Live credit balance badge
│   │   │       ├── CropResizeFrame.jsx  # Draggable canvas crop overlay
│   │   │       ├── CropResizeTimeline.jsx # Dual-slider time trimmer
│   │   │       ├── Footer.jsx           # Global landing footer
│   │   │       ├── Navbar.jsx           # Responsive landing navigation
│   │   │       ├── Sidebar.jsx          # Studio navigation & tool drawer
│   │   │       └── ToolInfoFaqSection.jsx # Contextual documentation & FAQ drawer
│   │   ├── config/
│   │   │   ├── creditCosts.js        # Frontend credit cost lookup table
│   │   │   └── tools.js              # Tool catalog definitions and metadata
│   │   ├── context/
│   │   │   └── CreditContext.jsx     # Global user credit React Context & local cache
│   │   ├── layout/
│   │   │   ├── Auth.jsx              # Sign-in / Sign-up page wrapper
│   │   │   └── Web.jsx               # Authenticated studio dashboard layout
│   │   ├── lib/
│   │   │   └── useReelCutterJob.js   # SSE & Polling hook for AI Reel Cutter
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx       # Public landing page with pricing & hero
│   │   │   ├── OnBoarding.jsx        # 3-step interactive user setup flow
│   │   │   ├── auth/                 # Clerk SignIn & SignUp views
│   │   │   └── web/                  # Individual studio tool views
│   │   │       ├── AiReelCutter.jsx
│   │   │       ├── AiSubtitleGenerator.jsx
│   │   │       ├── AiVideoSummary.jsx
│   │   │       ├── CropResize.jsx
│   │   │       ├── Home.jsx
│   │   │       ├── NoiseReduction.jsx
│   │   │       ├── Projects.jsx
│   │   │       ├── RemoveSilence.jsx
│   │   │       ├── Setting.jsx
│   │   │       ├── ThumbnailGenerator.jsx
│   │   │       ├── Tools.jsx
│   │   │       ├── VideoCompressor.jsx
│   │   │       ├── VideoEnhancer.jsx
│   │   │       ├── VideoToGif.jsx
│   │   │       └── YtDownloader.jsx
│   │   ├── routes/
│   │   │   ├── AuthRoutes.jsx        # Authentication route mappings
│   │   │   ├── Navigation.jsx        # Root route coordinator
│   │   │   └── WebRoutes.jsx         # Protected tool and dashboard routes
│   │   ├── App.jsx                   # React root component
│   │   └── main.jsx                  # React DOM entrypoint with ClerkProvider
│   ├── package.json
│   └── vite.config.js
│
├── DEPLOYMENT_CHECKLIST.md           # Production deployment instructions
└── README.md                         # Project overview
```

---

## 11. Deployment, Environment Configurations & Operations

### 11.1 Backend Environment Configuration (`backend/.env`)

```env
# Server & Network
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://studiox.app
FRONTEND_URLS=https://studiox.app,https://*.vercel.app,http://localhost:5173

# Database & Cache
DATABASE_URL=postgresql://postgres:password@localhost:5432/studiox_db?schema=public
REDIS_URL=redis://localhost:6379

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# AI Services
ASSEMBLYAI_API_KEY=...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
HF_REEL_CUTTER_BASE_URL=https://rajan18-studiox-reel-cutter.hf.space
HF_REEL_CUTTER_TOKEN=hf_...

# Administration & Exemptions
ADMIN_SECRET_KEY=super_secret_admin_key_...
CREDIT_EXCEPTION_EMAILS=founder@studiox.app,admin@studiox.app

# YouTube & yt-dlp Configuration
YTDLP_COOKIES_FILE=/path/to/cookies.txt
YTDLP_COOKIES_B64=...
```

### 11.2 Frontend Environment Configuration (`frontend/.env`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_BASE_URL=https://api.studiox.app
```

---

## 🏁 Summary

**StudioX** integrates modern web development (React 19, Vite, Tailwind CSS), media transcoding (`fluent-ffmpeg`, `yt-dlp`), and AI services (AssemblyAI, OpenAI, OpenRouter, Hugging Face) into a single creator studio. 

Its architecture guarantees:
* **Predictable Credit Management**: Transaction-backed credit allocations with automated monthly resets and failure auto-refunds.
* **Format & Platform Versatility**: Native support for horizontal (16:9), vertical (9:16), square (1:1), and portrait (4:5) workflows.
* **Resilient Media Processing**: Multi-attempt fallback encoding, anti-bot challenge bypasses, and real-time SSE streaming.
