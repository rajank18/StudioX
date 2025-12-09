# Backend Setup & Getting Started

## ✅ Completed Backend Infrastructure

Your StudioX backend is now **fully scaffolded and ready to run**. All 28+ files are created with production-grade architecture.

### What's Included

#### Core Files
- ✅ `src/app.js` - Express app with middleware setup
- ✅ `src/server.js` - Server initialization with graceful shutdown
- ✅ `.env.example` - Environment variables template
- ✅ `package.json` - Dependencies and npm scripts
- ✅ `StudioX_API.postman_collection.json` - API testing collection

#### Routes (3 files)
- ✅ `src/routes/userRoutes.js` - User management
- ✅ `src/routes/aiTaskRoutes.js` - Task management
- ✅ `src/routes/billingRoutes.js` - Billing & payments

#### Controllers (3 files)
- ✅ `src/controllers/userController.js` - User logic
- ✅ `src/controllers/aiTaskController.js` - Task logic
- ✅ `src/controllers/billingController.js` - Billing logic

#### Services (3 files)
- ✅ `src/services/userService.js` - User CRUD
- ✅ `src/services/taskService.js` - Task operations
- ✅ `src/services/creditService.js` - Credit management

#### Middleware (3 files)
- ✅ `src/middleware/auth.js` - Bearer token extraction
- ✅ `src/middleware/errorHandler.js` - Global error handling
- ✅ `src/middleware/requireCredits.js` - Credit validation

#### Utils (3 files)
- ✅ `src/utils/logger.js` - Logging utility
- ✅ `src/utils/planManager.js` - Plan operations
- ✅ `src/utils/creditManager.js` - Credit operations

#### Workers (1 file)
- ✅ `src/workers/monthlyCreditReset.js` - Cron jobs

#### Database
- ✅ `prisma/schema.prisma` - Database models
- ✅ `prisma/migrations/` - Migration history

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` with:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/studiox_dev
FRONTEND_URL=http://localhost:5173
PORT=3000
CLERK_SECRET_KEY=your_clerk_secret
STRIPE_SECRET_KEY=your_stripe_secret
```

### 3. Create Database

**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin (usually http://localhost:5050)
2. Create new Database named `studiox_dev`

**Option B: Using Terminal**
```bash
createdb -U postgres studiox_dev
```

Or if you have PostgreSQL CLI:
```bash
psql -U postgres -c "CREATE DATABASE studiox_dev;"
```

### 4. Run Prisma Migration
```bash
npm run prisma:migrate
```

Follow the prompts and name the migration (e.g., "init").

### 5. Start the Server
```bash
npm run dev
```

You should see:
```
Server running on port 3000
Database connected successfully
All workers initialized
Monthly credit reset worker scheduled for daily 2:00 AM
Task processing worker started
```

## ✅ Verification Checklist

Once running, test these endpoints:

```bash
# 1. Health check (should return ok)
curl http://localhost:3000/health

# 2. Get plans (public, no auth)
curl http://localhost:3000/api/billing/plans

# 3. Get user (needs auth token)
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" http://localhost:3000/api/users/me
```

## 📚 Project Architecture

```
Controller Layer
    ↓
Service Layer (Business Logic)
    ↓
Database Layer (Prisma)
    ↓
PostgreSQL
```

### Request Flow
1. Request → Express Route
2. Auth Middleware (Bearer token extraction)
3. Route Handler (Controller)
4. Service Layer (Validated business logic)
5. Database Operation (Prisma)
6. Response

### Error Handling
- All async functions wrapped with `asyncHandler()`
- Errors caught and passed to global error handler
- Returns JSON error with status code

## 🔐 Authentication

All protected routes require Bearer token:
```bash
curl -H "Authorization: Bearer <clerk_jwt_token>" http://localhost:3000/api/users/me
```

Tokens are extracted in `src/middleware/auth.js` and user ID is attached to `req.userId`.

## 💳 Credit System

### How It Works
1. User signup → Assigned plan (Free with 10 credits)
2. Create task → Automatically deducts credits
3. Cancel task → Refunds credits
4. Monthly reset → Happens at 2:00 AM UTC (cron job)
5. Purchase credits → Direct purchase endpoint

### Cost Examples
- Image Analysis: 1 credit
- Video Generation: 5 credits
- Advanced Editing: 3 credits

See `src/utils/creditManager.js` for all costs.

## 🔄 Cron Jobs

Two cron jobs run automatically:

**1. Monthly Credit Reset** (Daily 2:00 AM UTC)
- Finds users with expired credits
- Resets based on plan
- Updates next reset date

**2. Task Processing** (Every minute)
- Finds pending tasks
- Moves to processing status
- Ready for AI worker integration

## 📊 Database Models

### User
- id, clerkId, email, name
- credits, plan, billingInfo
- createdAt, creditResetAt

### AiTask
- id, userId, type, status
- input, output, metadata
- creditsUsed, createdAt, completedAt

### Plan
- id (free, pro, enterprise)
- monthlyCredits, features

### Transaction/UsageLog
- Records all credit movements

See `prisma/schema.prisma` for complete schema.

## 🧪 Testing with Postman

1. Import `StudioX_API.postman_collection.json` into Postman
2. Set variables:
   - `clerk_token` = Your Clerk JWT token
   - `task_id` = Created task ID
3. Run requests

Or use curl with your token.

## 🐛 Debugging

Enable logging by setting `NODE_ENV=development` in `.env`.

Check logs for:
- Database connection issues
- Cron job execution
- Task processing
- Credit deductions

## 🚨 Known Setup Requirements

1. **PostgreSQL must be running** on localhost:5432
2. **Clerk account** for JWT tokens (get from Clerk dashboard)
3. **Node.js 18+** for full ES6 support
4. **npm** or **yarn** for dependency management

## 📝 Next Steps

After setup, you can:
1. Integrate with AI provider (OpenAI, Hugging Face, etc.)
2. Implement task processing worker
3. Connect Stripe webhook for payments
4. Add email notifications
5. Setup monitoring/analytics

## 🎯 API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/health` | No | Server status |
| GET | `/api/users/me` | Yes | Get user profile |
| GET | `/api/users/credits` | Yes | Get credit balance |
| POST | `/api/users/initialize` | Yes | Initialize on signup |
| POST | `/api/tasks/create` | Yes | Create AI task |
| GET | `/api/tasks` | Yes | List user tasks |
| GET | `/api/billing/plans` | No | Get plans (public) |
| POST | `/api/billing/purchase-credits` | Yes | Buy credits |

See `API.md` for complete endpoint documentation.

## ❓ Troubleshooting

**Issue**: `Cannot find module 'express'`
- Solution: Run `npm install`

**Issue**: `Error: connect ECONNREFUSED`
- Solution: PostgreSQL not running. Start PostgreSQL service.

**Issue**: `database "studiox_dev" does not exist`
- Solution: Create database in pgAdmin or use `createdb studiox_dev`

**Issue**: `PrismaClientValidationError`
- Solution: Run `npm run prisma:migrate`

## 📞 Support

- Check `API.md` for endpoint details
- Check error messages (detailed error handler)
- Enable `NODE_ENV=development` for verbose logs
- Verify `.env` variables are set correctly

---

**Your backend is ready! Start with `npm run dev` and begin building.** 🎉
