# StudioX Backend API

A production-ready Node.js backend for StudioX AI Video Editing Platform with credit-based task management, billing integration, and automated workers.

## Tech Stack

- **Runtime**: Node.js with vanilla JavaScript (CommonJS)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM (v6.15.0)
- **Authentication**: Clerk (JWT tokens)
- **Scheduling**: node-cron
- **Payment**: Stripe integration (webhook support)

## Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server startup and graceful shutdown
├── config/
│   └── prisma.js          # Prisma client singleton
├── middleware/
│   ├── auth.js            # Bearer token extraction and user attachment
│   ├── errorHandler.js    # Global error handler with AppError class
│   └── requireCredits.js  # Credit validation middleware
├── routes/
│   ├── userRoutes.js      # User endpoints
│   ├── aiTaskRoutes.js    # Task endpoints
│   └── billingRoutes.js   # Billing endpoints
├── controllers/
│   ├── userController.js  # User logic
│   ├── aiTaskController.js # Task logic
│   └── billingController.js # Billing logic
├── services/
│   ├── userService.js     # User CRUD operations
│   ├── taskService.js     # Task management with credit deduction
│   └── creditService.js   # Credit and subscription management
├── utils/
│   ├── logger.js          # Logging utility
│   ├── planManager.js     # Plan-related operations
│   └── creditManager.js   # Credit operations
└── workers/
    └── monthlyCreditReset.js # Cron jobs (monthly reset, task processing)
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your actual values (DATABASE_URL, Clerk keys, Stripe keys, etc.)

3. **Create PostgreSQL database**:
   - Use pgAdmin or your PostgreSQL client
   - Create a database named `studiox_dev` (or name from DATABASE_URL)

4. **Run Prisma migrations**:
   ```bash
   npm run prisma:migrate
   ```

5. **Start the server**:
   ```bash
   npm run dev    # Development (watch mode via node)
   npm start      # Production
   ```

The server runs on `http://localhost:3000` by default.

## API Endpoints

### Health Check
- `GET /health` - Server status

### User Endpoints (`/api/users`)
All require authentication (Bearer token).

- `GET /me` - Get current user profile
- `GET /credits` - Get credit balance and plan info
- `GET /transactions` - Get credit transaction history
- `POST /initialize` - Initialize user on first login
- `POST /upgrade-plan` - Change subscription plan

### Task Endpoints (`/api/tasks`)
All require authentication.

- `POST /create` - Create new AI task (deducts credits)
- `GET /` - Get user's tasks
- `GET /:id` - Get task details
- `GET /stats` - Get task statistics
- `PATCH /:id/status` - Update task status (internal)
- `PATCH /:id/cancel` - Cancel task (refunds credits)

### Billing Endpoints (`/api/billing`)

Public:
- `GET /plans` - Get available plans
- `POST /webhook` - Stripe webhook (no auth required)

Authenticated:
- `POST /purchase-credits` - Purchase additional credits
- `POST /upgrade-plan` - Upgrade subscription (calls billingController.upgradePlan)
- `GET /history` - Get billing history
- `GET /next-date` - Get next billing date

## Credit System

### Plans
- **Free**: 10 credits/month, limited features
- **Pro**: 100 credits/month, standard features
- **Enterprise**: Unlimited, all features

### Feature Costs
- Image Analysis: 1 credit
- Video Generation: 5 credits
- Advanced Editing: 3 credits

### Credit Lifecycle
1. User starts with plan credits
2. Task creation deducts credits automatically
3. Task cancellation refunds credits
4. Monthly reset happens at 2:00 AM UTC via cron worker
5. Users can purchase additional credits anytime

## Cron Jobs

**Monthly Credit Reset** (Daily at 2:00 AM UTC):
- Finds users whose `creditResetAt` is in the past
- Resets credits based on plan
- Updates `creditResetAt` to next month

**Task Processing** (Every minute):
- Finds pending tasks
- Moves them to "processing" status
- Ready for AI processing integration

## Error Handling

All errors are caught by the global error handler and return JSON responses:

```json
{
  "error": "Error message",
  "statusCode": 400
}
```

Use the `AppError` class for custom errors:
```javascript
throw new AppError('Not enough credits', 400);
```

The `asyncHandler` wrapper catches errors in async route handlers.

## Database Schema

See `prisma/schema.prisma` for the complete schema. Main models:

- **User**: Profile, credits, plan, billing info
- **Plan**: Subscription tiers with credit limits
- **AiTask**: User tasks with status tracking
- **UsageLog**: Credit usage history
- **Transaction**: Billing transactions

## Environment Variables

```
DATABASE_URL              # PostgreSQL connection string
FRONTEND_URL              # Frontend origin for CORS
PORT                      # Server port (default: 3000)
NODE_ENV                  # Environment (development/production)
CLERK_SECRET_KEY          # Clerk API key
STRIPE_SECRET_KEY         # Stripe API key
STRIPE_WEBHOOK_SECRET     # Stripe webhook secret
OPENAI_API_KEY            # OpenAI API key (for future AI features)
```

## Notes

- All routes use CommonJS (`require`/`module.exports`)
- Authentication is Bearer token based (Clerk JWT)
- Error handling uses custom AppError class with asyncHandler wrapper
- Database operations use Prisma transactions where needed
- Cron jobs run with node-cron (no external schedulers needed)
- Graceful shutdown handles SIGTERM/SIGINT with cleanup

## Testing

Example using curl:

```bash
# Get plans (public)
curl http://localhost:3000/api/billing/plans

# Get user profile (requires auth header)
curl -H "Authorization: Bearer <clerk_token>" http://localhost:3000/api/users/me

# Health check
curl http://localhost:3000/health
```

## Deployment

1. Set `NODE_ENV=production` in `.env`
2. Ensure PostgreSQL is accessible
3. Set all required environment variables
4. Run `npm start`
5. For production, use a process manager like PM2:
   ```bash
   pm2 start src/server.js --name "studiox-api"
   ```
