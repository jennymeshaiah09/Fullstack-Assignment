# PulseVid — Video Sensitivity Analysis Platform

A full-stack application for uploading, processing, and streaming videos with AI-powered sensitivity analysis. Built with Node.js, React, MongoDB, AWS S3, and Google Cloud Video Intelligence API.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Sensitivity Analysis](#sensitivity-analysis)
- [Real-time Processing](#real-time-processing)
- [Authentication & RBAC](#authentication--rbac)

---

## Overview

PulseVid allows users to upload videos which are then automatically analysed for sensitive content using Google Cloud Video Intelligence API. Videos are stored on AWS S3, metadata in MongoDB Atlas, and real-time processing progress is pushed to the frontend via Socket.io.

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Video/user metadata storage |
| Socket.io | Real-time processing progress events |
| AWS S3 (`@aws-sdk/client-s3`) | Video and thumbnail file storage |
| Google Cloud Video Intelligence | AI sensitivity analysis |
| Google Cloud Storage | Temp storage for large files (>40MB) during analysis |
| fluent-ffmpeg | Thumbnail extraction from video frames |
| Multer (memoryStorage) | In-memory file handling for uploads |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |

### Frontend
| Package | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| React Router v6 | Client-side routing |
| Axios | HTTP API calls with JWT interceptor |
| Socket.io-client | Real-time processing progress |
| Context API | Auth state management |

---

## Architecture

```
┌─────────────┐     HTTP/WS      ┌──────────────────┐
│   React     │ ◄──────────────► │  Express API      │
│  Frontend   │                  │  (Port 5000)      │
└─────────────┘                  └────────┬─────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
             ┌──────▼──────┐    ┌─────────▼──────┐   ┌────────▼────────┐
             │ MongoDB      │    │   AWS S3        │   │ Google Cloud    │
             │ Atlas        │    │ (pulsevid-      │   │ Video           │
             │ (metadata)   │    │  videos)        │   │ Intelligence    │
             └─────────────┘    └────────────────┘   └─────────────────┘
```

**Upload flow:**
1. User selects video → Frontend sends multipart/form-data to backend
2. Backend uploads file buffer to AWS S3 (`videos/<uuid>.mp4`)
3. Backend saves metadata to MongoDB (status: `pending`)
4. Backend triggers async processing pipeline
5. Processing downloads file from S3, sends to Google Video Intelligence API
6. Results saved to MongoDB, Socket.io emits completion event to frontend

---

## Features

- **Video upload** — drag & drop or file browser, supports MP4, WebM, MOV, AVI, MKV up to 500MB
- **Real-time progress** — live processing stages (Validating → Analysing → Classifying → Complete) via Socket.io
- **AI sensitivity analysis** — Google Cloud Video Intelligence detects adult content, violence, and hate speech
- **Large file support** — files >40MB are routed via Google Cloud Storage for analysis
- **Video streaming** — HTTP range request support for smooth in-browser playback
- **Thumbnail generation** — FFmpeg extracts frame at 2 seconds, uploaded to S3
- **Video library** — filter by status (safe/flagged/processing/pending), search by title, sort by date/name
- **JWT authentication** — register/login with role-based access control
- **Multi-tenant** — users only see their own videos; admins see all
- **Delete videos** — removes from both S3 and MongoDB

---

## Project Structure

```
Fullstack Assignment/
├── backend/
│   ├── config/
│   │   ├── s3.js                  # AWS S3 client
│   │   └── google-credentials.json # GCP service account (do not commit)
│   ├── controllers/
│   │   ├── authController.js      # register, login, getMe
│   │   └── videoController.js     # upload, process, stream, delete
│   ├── middleware/
│   │   ├── auth.js                # JWT protect + RBAC authorise
│   │   └── upload.js              # Multer memoryStorage config
│   ├── models/
│   │   ├── User.js                # User schema (name, email, password, role)
│   │   └── Video.js               # Video schema (metadata + analysis results)
│   ├── routes/
│   │   ├── auth.js                # /api/auth routes
│   │   └── videos.js              # /api/videos routes
│   ├── .env                       # Environment variables (do not commit)
│   ├── server.js                  # Express + Socket.io server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoCard.jsx      # Video grid card with thumbnail + status badge
│   │   │   ├── ProcessingStatus.jsx # Progress bar + stage stepper
│   │   │   ├── Navbar.jsx         # Top navigation
│   │   │   └── ProtectedRoute.jsx # Auth guard for routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # JWT auth state (login/logout/user)
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login page
│   │   │   ├── Register.jsx       # Register page
│   │   │   ├── Dashboard.jsx      # Stats overview + recent videos
│   │   │   ├── Upload.jsx         # Upload page with drag & drop
│   │   │   ├── Library.jsx        # Video grid with filter/search/sort
│   │   │   └── VideoPlayer.jsx    # Video player + analysis results
│   │   ├── utils/
│   │   │   └── api.js             # Axios instance with JWT interceptor
│   │   ├── App.jsx                # Routes definition
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # Global styles + CSS variables
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- AWS account with S3 bucket
- Google Cloud project with Video Intelligence API enabled

### 1. Clone and install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env` (see [Environment Variables](#environment-variables) section below).

### 3. Add Google credentials

Place your GCP service account JSON file at:
```
backend/config/google-credentials.json
```

### 4. Run the application

```bash
# Terminal 1 — Backend
cd backend
npm run dev        # uses nodemon, restarts on changes
# or
npm start          # production

# Terminal 2 — Frontend
cd frontend
npm run dev        # Vite dev server at http://localhost:5173
```

---

## Environment Variables

Create `backend/.env` with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name

# File upload
MAX_FILE_SIZE=524288000
UPLOAD_DIR=uploads
```

---

## API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and get JWT token |
| GET | `/api/auth/me` | Yes | Get current user profile |

**Register request body:**
```json
{
  "name": "Jenny",
  "email": "jenny@example.com",
  "password": "password123",
  "role": "admin"
}
```

**Login response:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "name": "Jenny",
    "email": "jenny@example.com",
    "role": "admin"
  }
}
```

---

### Video Routes — `/api/videos`

All video routes require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload a video file (multipart/form-data, field: `video`) |
| GET | `/api/videos` | Get all videos for current user |
| GET | `/api/videos?status=flagged` | Filter videos by status |
| GET | `/api/videos/:id` | Get single video metadata |
| GET | `/api/videos/:id/stream` | Stream video (supports HTTP Range requests) |
| DELETE | `/api/videos/:id` | Delete video from S3 and MongoDB |

**Upload response:**
```json
{
  "video": {
    "_id": "69ccf0bd...",
    "title": "myvideo",
    "status": "pending",
    "s3Key": "videos/uuid.mp4",
    "s3Url": "https://bucket.s3.region.amazonaws.com/videos/uuid.mp4",
    "fileSize": 98764321,
    "mimeType": "video/mp4",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Video status values:** `pending` → `processing` → `safe` or `flagged`

**Video object (full):**
```json
{
  "_id": "...",
  "title": "My Video",
  "originalName": "480p.h264.mp4",
  "s3Key": "videos/uuid.mp4",
  "s3Url": "https://...",
  "thumbnailUrl": "https://.../thumbnails/id.jpg",
  "fileSize": 98764321,
  "mimeType": "video/mp4",
  "duration": 0,
  "status": "flagged",
  "sensitivityScore": 85,
  "sensitivityDetails": {
    "violence": false,
    "adult": true,
    "hate": false
  },
  "processingStage": "complete",
  "processingProgress": 100,
  "uploadedBy": "userId",
  "organisation": "default",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Sensitivity Analysis

Analysis is powered by **Google Cloud Video Intelligence API**.

### How it works

1. After upload, the backend downloads the video from S3 to a temp directory
2. If the file is **≤ 40MB** — sent as base64 inline to the API
3. If the file is **> 40MB** — uploaded to `pulsevid-video-intel-tmp` GCS bucket, then passed as `gs://` URI
4. The temp file is deleted from GCS immediately after analysis
5. Results are stored in MongoDB and emitted via Socket.io

### Detection categories

| Category | API Feature | What it detects |
|---|---|---|
| **Adult / Explicit** | `EXPLICIT_CONTENT_DETECTION` | Pornographic content, per-frame likelihood |
| **Violence** | `LABEL_DETECTION` | Labels: fighting, weapon, blood, shooting, combat, war, etc. |
| **Hate Speech** | `LABEL_DETECTION` | Labels: hate, racism, extremism, terrorism, etc. |

### Scoring

- Likelihood values: `VERY_UNLIKELY (0)` → `UNLIKELY (10)` → `POSSIBLE (40)` → `LIKELY (75)` → `VERY_LIKELY (95)`
- **Flagged** if any category score ≥ 40 (POSSIBLE or higher)
- Final `sensitivityScore` = highest score across all categories

### Pricing

- First **1,000 minutes/month free** per feature
- Beyond free tier: **$0.10 per minute** per feature
- A 17-minute video costs ~$0.34 with both features enabled

---

## Real-time Processing

Socket.io is used to push processing updates to the frontend without polling.

### Events emitted by server

**`processing_progress`** — fired at each stage:
```json
{
  "videoId": "69ccf0bd...",
  "stage": "analysing",
  "progress": 50
}
```

**`processing_complete`** — fired when analysis is done:
```json
{
  "videoId": "69ccf0bd...",
  "status": "safe",
  "sensitivityScore": 5,
  "sensitivityDetails": {
    "violence": false,
    "adult": false,
    "hate": false
  }
}
```

### Processing stages

| Stage | Progress | Description |
|---|---|---|
| validating | 20% | File integrity checks |
| analysing | 50% | Google Video Intelligence API call |
| classifying | 80% | Parsing and scoring results |
| complete | 100% | Results saved to MongoDB |

---

## Authentication & RBAC

### JWT Flow
1. User registers/logs in → receives JWT (expires in 7 days)
2. JWT stored in `localStorage`
3. All API requests include `Authorization: Bearer <token>` header
4. For video streaming via browser `<video>` tag — token passed as `?token=` query param

### Roles

| Role | Permissions |
|---|---|
| `viewer` | View and stream own videos only |
| `editor` | Upload, view, stream, delete own videos |
| `admin` | Full access — can view/stream/delete any user's videos |

### Video streaming auth
The stream endpoint accepts the JWT as a query parameter because browsers send video requests without custom headers:
```
GET /api/videos/:id/stream?token=eyJhbGci...
```
