# Ethara - Team Task Manager

A production-grade Team Task Manager web application built with a modern full-stack architecture. 

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, React Hook Form, Zod, @dnd-kit
- **Backend:** Node.js, Express, TypeScript, Prisma (PostgreSQL), Zod
- **Authentication:** JWT (Access & Refresh tokens) via HttpOnly cookies, bcrypt hashing
- **Deployment:** Docker, Railway

## Features
- **Authentication:** Secure login/register with HttpOnly cookies.
- **Role-Based Access Control:** Workspace members and Admins.
- **Projects:** Create projects, manage members.
- **Kanban Board:** Drag and drop tasks across columns (To Do, In Progress, In Review, Done).
- **Task Management:** Assign tasks, set priorities, due dates.
- **Comments:** Discussion threads on tasks.
- **Activity Log:** Audit trail of important actions.
- **Dashboard:** Personal overview of tasks and recent activity.

## Local Setup

### Prerequisites
- Node.js v20+
- PostgreSQL database (running locally or via Docker)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the values, specifically the `DATABASE_URL`.

### Database Setup
1. Push the Prisma schema to your database:
   ```bash
   cd backend
   npx prisma db push
   ```
   *(Or `npx prisma migrate dev` if you prefer migrations)*
2. Seed the database with demo data:
   ```bash
   npm run prisma:seed
   ```

### Running Locally
You can run the frontend and backend concurrently.
Open two terminal tabs:

**Tab 1 (Backend):**
```bash
cd backend
npm run dev
```

**Tab 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## Demo Credentials (from Seed)
- **Admin:** `admin@demo.com`
- **Member:** `member@demo.com`
- **Password:** `Demo@1234`

## Deployment (Railway)
This project is configured as a Monorepo. For the simplest deployment on Railway:
1. Connect your GitHub repository to Railway.
2. Add a **PostgreSQL** plugin in your Railway environment.
3. Railway will automatically detect the `Dockerfile` and `railway.json`.
4. Ensure the following Environment Variables are set in your Railway service:
   - `DATABASE_URL` (Provided by Postgres plugin)
   - `ACCESS_TOKEN_SECRET`
   - `REFRESH_TOKEN_SECRET`
   - `NODE_ENV=production`

The Dockerfile builds both the frontend and backend, and the Express server serves the compiled Vite static files on port 3001.
