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
=======
```
