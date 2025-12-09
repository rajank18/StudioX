# StudioX Backend - Complete Project Structure

## Directory Tree

```
backend/
├── node_modules/                    # Dependencies (172 packages)
├── prisma/
│   ├── schema.prisma               # Database models
│   ├── migrations/
│   │   ├── migration_lock.toml
│   │   └── 20251209170922_init/
│   │       └── migration.sql
│   └── .env                        # Prisma env reference
├── src/
│   ├── app.js                      # Express app setup
│   ├── server.js                   # Server startup & workers
│   │
│   ├── config/
│   │   └── prisma.js               # Prisma client singleton
│   │
│   ├── middleware/
│   │   ├── auth.js                 # Bearer token extraction
│   │   ├── errorHandler.js         # Global error handler
│   │   └── requireCredits.js       # Credit validation
│   │
│   ├── routes/
│   │   ├── userRoutes.js           # User endpoints
│   │   ├── aiTaskRoutes.js         # Task endpoints
│   │   └── billingRoutes.js        # Billing endpoints
│   │
│   ├── controllers/
│   │   ├── userController.js       # User logic
│   │   ├── aiTaskController.js     # Task logic
│   │   └── billingController.js    # Billing logic
│   │
│   ├── services/
│   │   ├── userService.js          # User CRUD
│   │   ├── taskService.js          # Task operations
│   │   └── creditService.js        # Credit management
│   │
│   ├── utils/
│   │   ├── logger.js               # Logging
│   │   ├── planManager.js          # Plan operations
│   │   └── creditManager.js        # Credit operations
│   │
│   └── workers/
│       └── monthlyCreditReset.js   # Cron jobs
│
├── .env.example                    # Environment template
├── .env                            # Environment config (create from .env.example)
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config (not used, JS only)
├── README.md                       # Original README
├── API.md                          # API documentation
├── SETUP.md                        # Setup guide
└── StudioX_API.postman_collection.json # Postman collection
```

## File Count Summary

- **Config**: 1 file
- **Middleware**: 3 files
- **Routes**: 3 files
- **Controllers**: 3 files
- **Services**: 3 files
- **Utils**: 3 files
- **Workers**: 1 file
- **Root/Config**: 7 files (app.js, server.js, package.json, .env, etc.)
- **Prisma**: 4 files (schema, migrations)
- **Documentation**: 3 files (API.md, SETUP.md, this file)

**Total: 31 production-ready files**

---

## Key Features Implemented

### Authentication
- ✅ Clerk JWT verification (Bearer token)
- ✅ User ID extraction from token
- ✅ Protected route middleware

### User Management
- ✅ User CRUD operations
- ✅ Credit balance tracking
- ✅ Transaction history
- ✅ Plan management (Free, Pro, Enterprise)
- ✅ User initialization on signup

### Task Management
- ✅ Create AI tasks
- ✅ Automatic credit deduction
- ✅ Task status tracking
- ✅ Task cancellation with credit refund
- ✅ Task statistics

### Credit System
- ✅ Monthly credit allocation per plan
- ✅ Automatic monthly reset (cron)
- ✅ Credit purchase endpoint
- ✅ Credit usage tracking
- ✅ Credit balance validation before task creation
- ✅ Feature-specific credit costs

### Billing
- ✅ Plan management
- ✅ Transaction tracking
- ✅ Billing history
- ✅ Stripe webhook support
- ✅ Next billing date calculation

### Background Jobs
- ✅ Monthly credit reset (daily 2:00 AM UTC)
- ✅ Task processing (every minute)
- ✅ Graceful shutdown handling

### Error Handling
- ✅ Global error handler
- ✅ Custom AppError class
- ✅ Async error wrapping
- ✅ Detailed error messages

### Logging
- ✅ Simple logger utility
- ✅ Info/error/debug levels
- ✅ Request tracking

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Language | JavaScript (CommonJS) |
| Framework | Express.js 4.21 |
| Database | PostgreSQL 12+ |
| ORM | Prisma 6.15 |
| Auth | Clerk |
| Scheduling | node-cron |
| Payment | Stripe (integration ready) |
| Testing | Postman collection included |

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/studiox_dev

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Authentication
CLERK_SECRET_KEY=sk_test_xxx

# Payment
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# AI (optional, for future integration)
OPENAI_API_KEY=sk-xxx
```

---

## API Routes Overview

### User Routes (`/api/users`) - All require auth
- `GET /me` - Current user profile
- `GET /credits` - Credit balance
- `GET /transactions` - Transaction history
- `POST /initialize` - Initialize user
- `POST /upgrade-plan` - Change plan

### Task Routes (`/api/tasks`) - All require auth
- `POST /create` - Create task (auto-deducts credits)
- `GET /` - List user's tasks
- `GET /:id` - Get task details
- `GET /stats` - Task statistics
- `PATCH /:id/status` - Update task status
- `PATCH /:id/cancel` - Cancel task (refunds credits)

### Billing Routes (`/api/billing`)
- `GET /plans` - List plans (public)
- `POST /webhook` - Stripe webhook (public)
- `POST /purchase-credits` - Buy credits (auth)
- `POST /upgrade-plan` - Change subscription (auth)
- `GET /history` - Billing history (auth)
- `GET /next-date` - Next billing date (auth)

### Health Check
- `GET /health` - Server status

---

## Database Schema Overview

### User
```
id: UUID
clerkId: String (unique)
email: String (unique)
name: String
credits: Int (current balance)
planId: String (free|pro|enterprise)
billingInfo: JSON
createdAt: DateTime
creditResetAt: DateTime (next reset)
```

### AiTask
```
id: UUID
userId: UUID (FK)
type: String (image_analysis|video_generation|advanced_editing)
status: String (pending|processing|completed|failed|cancelled)
input: String (URL or file path)
output: String (nullable)
metadata: JSON
creditsUsed: Int
createdAt: DateTime
completedAt: DateTime (nullable)
```

### Plan
```
id: String (free|pro|enterprise)
monthlyCredits: Int
features: String[]
```

### Transaction
```
id: UUID
userId: UUID
amount: Int
type: String (credit_deduction|credit_purchase|plan_upgrade)
description: String
createdAt: DateTime
```

---

## Error Handling Pattern

All errors use custom `AppError` class:

```javascript
throw new AppError('Not enough credits', 400);
```

Global handler catches and responds with:
```json
{
  "error": "Not enough credits",
  "statusCode": 400
}
```

---

## Middleware Stack

1. **CORS** - Allow requests from frontend
2. **JSON Parser** - Parse request bodies
3. **Auth Middleware** - Extract Bearer token
4. **Route Handlers** - Process requests
5. **Error Handler** - Catch and format errors

---

## Cron Jobs

### Monthly Credit Reset
- **Schedule**: Daily 2:00 AM UTC
- **Action**: Reset user credits based on plan
- **Finds**: Users where `creditResetAt <= now`

### Task Processing
- **Schedule**: Every minute
- **Action**: Move pending tasks to processing
- **Takes**: 10 tasks per run

---

## Getting Started Checklist

- [ ] `npm install` - Install dependencies
- [ ] `cp .env.example .env` - Create .env file
- [ ] Update `.env` with database URL and API keys
- [ ] Create PostgreSQL database `studiox_dev`
- [ ] `npm run prisma:migrate` - Run migrations
- [ ] `npm run dev` - Start server
- [ ] Import `StudioX_API.postman_collection.json` into Postman
- [ ] Test endpoints with your Clerk token

---

## Production Deployment

For production:

1. Set `NODE_ENV=production` in `.env`
2. Use environment-specific database URL
3. Use real Stripe/Clerk keys (not test keys)
4. Setup process manager (PM2):
   ```bash
   pm2 start src/server.js --name "studiox-api"
   pm2 startup
   pm2 save
   ```
5. Setup reverse proxy (Nginx/Apache)
6. Enable HTTPS
7. Setup monitoring/alerting

---

## Key Files to Review

1. **`src/app.js`** - Express configuration and middleware
2. **`src/server.js`** - Server startup and worker initialization
3. **`prisma/schema.prisma`** - Database models
4. **`src/middleware/auth.js`** - How authentication works
5. **`src/utils/creditManager.js`** - Credit cost system
6. **`src/services/taskService.js`** - Task creation with credit deduction

---

## Architecture Decisions

✅ **CommonJS over ES Modules** - Simpler Node.js compatibility
✅ **Prisma ORM** - Type-safe database queries
✅ **Middleware pattern** - Clean separation of concerns
✅ **Service layer** - Business logic isolated from routes
✅ **Cron jobs** - Serverless scheduled tasks
✅ **Error wrapping** - All async functions wrapped
✅ **Singleton pattern** - Prisma client reused

---

## Next Integration Steps

1. **Task Processing Worker** - Connect to AI service (OpenAI, etc.)
2. **Email Notifications** - Notify users of task completion
3. **Analytics** - Track user behavior and usage
4. **File Storage** - Integrate S3/Cloudinary for media
5. **Webhooks** - Send task updates to frontend
6. **Rate Limiting** - Prevent API abuse
7. **Caching** - Redis for frequently accessed data

---

**Backend is ready for development and testing!** 🚀
