# Deployment Guide

This application is a Next.js project using Drizzle ORM and PostgreSQL. Follow these steps to go live today.

## 1. Database Setup (Recommended: Neon.tech)
The easiest way to get a production-ready PostgreSQL database is [Neon](https://neon.tech).
1. Create a free account at Neon.tech.
2. Create a new project and database.
3. Copy the **Connection String** (it looks like `postgresql://user:password@host/dbname?sslmode=require`).

## 2. Hosting Setup (Recommended: Vercel)
[Vercel](https://vercel.com) is the native platform for Next.js.
1. Connect your GitHub repository to Vercel.
2. In the **Environment Variables** section, add:
   - `DATABASE_URL`: (Paste your Neon connection string here)
3. Deploy the application.

## 3. Database Migration
Your database needs the schema applied before the app can work.
1. On your local machine, create a `.env` file and add `DATABASE_URL=your_neon_connection_string`.
2. Run the following commands:
   ```bash
   pnpm install
   pnpm db:generate  # Creates the migration files
   pnpm db:migrate    # Applies the schema to your production database
   ```

## 4. Production Checklist
- [ ] **Database URL**: Verified in Vercel environment variables.
- [ ] **Migrations**: Run `pnpm db:migrate` against the production DB.
- [ ] **Health Check**: Visit `/api/health` on your live URL to confirm DB connectivity.
- [ ] **Profile**: Update your "Personal Workspace" name and address in Settings to your business details for the default draft letters.

## Troubleshooting
- **Database Connection Errors**: Ensure `sslmode=require` is at the end of your connection string.
- **Internal Server Error (500)**: Check Vercel logs to see if the database migration was missed.

