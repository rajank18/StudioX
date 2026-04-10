# StudioX Deployment Checklist (Vercel Frontend + Render Backend)

## 1. Immediate Security Cleanup
- Rotate all secrets that were ever stored in local env snapshots or shared logs:
- Clerk secret key
- OpenRouter API key
- OpenAI API key
- AssemblyAI API key
- Database credentials
- Redis credentials
- Admin password/salt/secret
- Never commit real .env files to Git.

## 2. Frontend Deployment (Vercel)
- Import the repository to Vercel.
- Set Root Directory to frontend.
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

### Vercel Environment Variables
- VITE_API_BASE_URL = your backend URL (Render URL)
- VITE_CLERK_PUBLISHABLE_KEY = your Clerk publishable key

## 3. Backend Deployment (Render)
- Create a new Web Service on Render from this repo.
- Root Directory: backend
- Build Command: npm install
- Start Command: npm start
- Health Check Path: /health

### Render Environment Variables
- Use backend/.env.example as the source template.
- Fill every required secret and URL from your providers.
- Set FRONTEND_URL to your Vercel production domain.

## 4. Clerk Configuration
- In Clerk Dashboard:
- Add Vercel domain to allowed origins/redirect URLs.
- Keep only publishable key on frontend.
- Keep secret key only on backend.

## 5. CORS and API Connectivity
- Backend CORS already reads FRONTEND_URL.
- Ensure FRONTEND_URL exactly matches your deployed Vercel URL.
- Ensure VITE_API_BASE_URL points to Render backend URL.

## 6. Abuse and Cost Controls (Already Added)
- Plan-based size and duration constraints for:
- AI Video Summary
- AI Subtitle Generator
- AI Reel Cutter
- Rate limits for info/generate endpoints.
- Redis caching for faster credit retrieval and lower DB load.

## 7. Production Validation
- Open frontend and sign in.
- Confirm no sensitive user data appears in browser console.
- Verify these API checks:
- GET /health works
- Credit card loads quickly
- Free-plan constraints reject oversized/too-long media early
- Insufficient-credit users are blocked at fetch-info stage

## 8. Ongoing Safety
- Enable provider usage limits/budgets (OpenRouter, AssemblyAI, OpenAI).
- Monitor Render logs for repeated 429 responses and abusive patterns.
- Periodically rotate admin and API secrets.
- Keep CREDIT_EXCEPTION_EMAILS minimal and env-managed only.
