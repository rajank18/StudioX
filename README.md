<div align="center">

# 🎬 StudioX

**Next-Generation AI Video Editing & Media Processing Platform**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.15-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)

An all-in-one web-based studio empowering creators, editors, and teams with AI-driven content generation, automatic reel creation, transcriptions, audio enhancements, FFmpeg-powered video utilities, and credit-based subscription management.

[Explore Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#%EF%B8%8F-technology-stack) • [API Documentation](#-api-architecture) • [Deployment](#-deployment)

</div>

---

## 🌟 Overview

**StudioX** bridges the gap between raw video footage and viral content. Built with high performance and creator workflows in mind, StudioX leverages server-side FFmpeg processing, state-of-the-art AI transcription models (AssemblyAI), Large Language Models (OpenAI/OpenRouter), and Hugging Face inference endpoints to automate time-consuming video editing tasks.

Whether you're clipping podcasts into viral short-form reels, generating auto-subtitles, clearing out awkward silences, or compressing video files without quality loss, StudioX provides an intuitive dashboard backed by a robust, scalable architecture.

---

## ✨ Features

### 🤖 AI-Powered Tools
* **AI Reel Cutter**: Transform long-form videos or YouTube links into viral short reels (TikTok/Shorts/Reels) with smart clip selection, resolution scaling, and automatic caption burn-in.
* **AI Subtitle Generator**: Automatically transcribe audio and generate sync-perfect subtitles and captions with customization options for fonts, colors, and positioning.
* **AI Video Summarizer**: Generate concise text summaries, main points, action items, and timestamped chapter breakdowns from long videos and lectures.
* **AI Thumbnail Generator**: Analyze video content to automatically capture optimal freeze-frames and design striking thumbnail concepts.

### 🛠️ Media & FFmpeg Utilities
* **Silence Remover**: Detect and remove silent pauses, dead air, and awkward breaks automatically.
* **Video-to-GIF Converter**: Convert video clips into smooth, optimized GIF animations with control over FPS, dimensions, and color palette optimization.
* **Audio Noise Reduction**: Filter out background static, hums, wind noise, and audio artifacts for crisp voice clarity.
* **Crop & Resize**: Intelligent aspect ratio formatting (`16:9`, `9:16`, `1:1`, `4:5`) tailored for YouTube, Instagram, TikTok, and LinkedIn.
* **Video Enhancer**: Adjust brightness, contrast, saturation, sharpness, and upscale video resolution.
* **Smart Video Compressor**: Reduce file sizes significantly using multi-pass compression algorithms without compromising visual fidelity.
* **YouTube Media Importer**: Fetch and process content directly from YouTube links.

### 💳 Platform & Infrastructure Features
* **Authentication**: Seamless, secure user sign-in and session management powered by Clerk JWT authentication.
* **Tiered Subscription & Credit System**: Integrated plans (*Free*, *Pro*, *Enterprise*) with credit limits, feature-specific credit usage, and automatic monthly resets via automated background cron jobs.
* **Background Processing & Queues**: Real-time progress updates via Server-Sent Events (SSE) and background worker queues.
* **Admin Dashboard & Usage Controls**: Rate-limiting, plan-based abuse controls, credit exception handling, and transaction logging.

---

## 🛠️ Technology Stack

### Frontend
* **Core Framework**: React 19 + Vite 7
* **Styling & UI**: Tailwind CSS v4, Base UI, Lucide React Icons, Framer Motion, Animated CSS
* **Authentication**: `@clerk/clerk-react`
* **3D Graphics & Canvas**: Three.js & `@react-three/fiber`
* **Client Media Processing**: `ffmpeg.js`, `gif.js.optimized`
* **Routing**: React Router v7

### Backend
* **Runtime**: Node.js (v18+) & Express.js 4.21
* **Database & ORM**: PostgreSQL & Prisma ORM v6
* **Caching & Queue**: Redis
* **Authentication**: `@clerk/clerk-sdk-node`
* **Media Engines**: `fluent-ffmpeg`, `ffmpeg-static`, `ffprobe-static`, `yt-dlp-exec`, `sharp`
* **AI Services**: AssemblyAI SDK, OpenAI SDK, Replicate, Hugging Face Spaces API
* **Scheduling**: `node-cron`

---

## 📁 Repository Structure

```
StudioX/
├── frontend/                     # React + Vite Client Application
│   ├── src/
│   │   ├── components/           # Reusable UI components & dialogs
│   │   ├── context/              # React Context (Auth, Theme, Credits)
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Product landing page
│   │   │   └── web/              # App dashboard & tool pages
│   │   │       ├── AiReelCutter.jsx
│   │   │       ├── AiSubtitleGenerator.jsx
│   │   │       ├── AiVideoSummary.jsx
│   │   │       ├── RemoveSilence.jsx
│   │   │       ├── VideoToGif.jsx
│   │   │       ├── VideoCompressor.jsx
│   │   │       └── ...
│   │   └── routes/               # App routing configuration
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Node.js + Express API Server
│   ├── prisma/
│   │   └── schema.prisma         # Database models & relationships
│   ├── src/
│   │   ├── controllers/          # Request handlers & logic
│   │   ├── middleware/           # Auth, credit validation, error handler
│   │   ├── routes/               # API endpoint definitions
│   │   ├── services/             # Business & AI service logic
│   │   ├── utils/                # Credit manager, logger, plan manager
│   │   ├── workers/              # Cron jobs (Monthly resets, task processors)
│   │   ├── app.js                # Express app setup & CORS setup
│   │   └── server.js             # HTTP server entrypoint
│   ├── API.md                    # Detailed API route documentation
│   ├── PROJECT_STRUCTURE.md     # In-depth architectural blueprint
│   └── package.json
│
└── DEPLOYMENT_CHECKLIST.md       # Production deployment instructions
```

---

## 🚀 Quick Start

### Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18.x or higher)
* [PostgreSQL](https://www.postgresql.org/) (v12.x or higher)
* [Redis](https://redis.io/) (optional, for caching & rate limiting)
* [Git](https://git-scm.com/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/StudioX.git
cd StudioX
```

---

### 2. Backend Setup

Navigate to the `backend` folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (or copy from `.env.example`):
```bash
cp .env.example .env
```

Configure your `.env` parameters:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/studiox_dev?schema=public"

# Auth
CLERK_SECRET_KEY=sk_test_your_clerk_secret

# AI & API Providers
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key
HF_REEL_CUTTER_BASE_URL=https://rajan18-studiox-reel-cutter.hf.space
```

Run database migrations:
```bash
npm run prisma:migrate
```

Start the backend development server:
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

---

### 3. Frontend Setup

Open a new terminal tab, navigate to the `frontend` directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

Start the frontend development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Architecture

The backend exposes RESTful endpoints grouped by module. Secured routes require a Bearer token issued by Clerk.

| HTTP Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Server & system health status check | ❌ |
| `GET` | `/api/users/me` | Retrieve authenticated user profile | ✅ |
| `GET` | `/api/users/credits` | Fetch user credit balance & plan limits | ✅ |
| `POST` | `/api/tasks/create` | Trigger an asynchronous AI editing task | ✅ |
| `POST` | `/api/reel-cutter/generate` | Process video or YouTube URL into reels | ✅ |
| `GET` | `/api/reel-cutter/progress/:jobId` | SSE stream for real-time reel generation | ✅ |
| `POST` | `/api/ai-video-summary/summarize` | Generate video summary & transcript | ✅ |
| `POST` | `/api/ai-subtitle/generate` | Auto-generate video subtitles | ✅ |
| `POST` | `/api/video/to-gif/convert` | Convert video to optimized GIF | ✅ |
| `POST` | `/api/noise-reduction/process` | Clean and enhance video audio | ✅ |
| `POST` | `/api/crop-resize/process` | Crop & re-scale video dimensions | ✅ |
| `POST` | `/api/video-compressor/compress` | Compress video file size | ✅ |
| `GET` | `/api/billing/plans` | Fetch available subscription tiers | ❌ |

For complete payload specifications and Postman collections, check out [`backend/API.md`](file:///E:/github/StudioX/backend/API.md).

---

## 🗄️ Database Schema

StudioX utilizes **PostgreSQL** managed through **Prisma ORM**. Key models include:

* **User**: Tracks Clerk authentication ID, email, credit balance, assigned subscription plan, and billing cycle metadata.
* **AiTask**: Logs execution history for AI tools, inputs/outputs, processing state (`pending`, `processing`, `completed`, `failed`), and credits consumed.
* **Plan**: Defines plan limits (*Free*, *Pro*, *Enterprise*), monthly allocated credits, and permitted features.
* **Transaction**: Maintains an audit log of credit usage, purchases, refunds, and subscription changes.

---

## 💰 Credit System & Plans

| Plan | Monthly Credits | Key Capabilities |
|---|---|---|
| **Free** | 10 Credits | Access to basic utilities, lower file duration limits |
| **Pro** | 500 Credits | Full access to AI Reel Cutter, AI Summarizer, High Res export |
| **Enterprise** | Custom | Priority queue processing, max file sizes, bulk export |

Credit cost per operation:
* **Image Analysis**: 1 Credit
* **Silence Removal / GIF Conversion**: 2 Credits
* **Video Enhancement / Noise Reduction**: 3 Credits
* **AI Reel Cutter / AI Subtitles / Video Summarizer**: 5 Credits

---

## 📦 Production Deployment

StudioX is designed for seamless continuous deployment:
* **Frontend**: Deploy on **Vercel** (Build Command: `npm run build`, Output Directory: `dist`).
* **Backend**: Deploy on **Render** or **Railway** (Start Command: `npm start`).
* **Database**: Managed **PostgreSQL** instance (Neon, Supabase, or Render Postgres).

For complete step-by-step security checks and environment configurations, view the [`DEPLOYMENT_CHECKLIST.md`](file:///E:/github/StudioX/DEPLOYMENT_CHECKLIST.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for creators and developers by the StudioX Team.</sub>
</div>