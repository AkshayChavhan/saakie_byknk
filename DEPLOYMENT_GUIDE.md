# Saree Shop Backend - Complete Deployment Guide

This document covers the complete setup process for the saree-shop-backend project, from initialization to production deployment on Google Cloud Platform (GCP) App Engine.

---

## Table of Contents

1. [Project Initialization](#1-project-initialization)
2. [Folder Structure](#2-folder-structure)
3. [Git Repository Setup](#3-git-repository-setup)
4. [Branch Strategy & Protection](#4-branch-strategy--protection)
5. [Google Cloud Platform Setup](#5-google-cloud-platform-setup)
6. [GitHub Actions CI/CD Setup](#6-github-actions-cicd-setup)
7. [Environment Variables Management](#7-environment-variables-management)
8. [Deployment Workflow](#8-deployment-workflow)
9. [Verification & Testing](#9-verification--testing)

---

## 1. Project Initialization

### 1.1 Create Next.js Project

```bash
npx create-next-app@latest saree-shop-backend --typescript --tailwind --eslint --app
cd saree-shop-backend
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install @clerk/nextjs @prisma/client @tanstack/react-query axios lucide-react

# UI Components (Radix UI)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select

# Development dependencies
npm install -D prisma @types/node @types/react typescript
```

### 1.3 Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema file
- `.env` - Environment variables file

### 1.4 Configure Prisma for MongoDB

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### 1.5 Add Scripts to package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio"
  }
}
```

---

## 2. Folder Structure

```
saree-shop-backend/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── admin/                    # Admin dashboard
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── products/
│   │   └── users/
│   ├── api/                      # API routes
│   │   ├── cart/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── users/
│   │   └── webhooks/
│   ├── cart/                     # Shopping cart pages
│   ├── categories/               # Category browsing
│   ├── products/                 # Product details
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── components/                   # Reusable React components
│   ├── auth/                     # Authentication components
│   ├── cart/                     # Cart components
│   ├── home/                     # Home page sections
│   ├── layout/                   # Header, Footer
│   ├── products/                 # Product components
│   ├── providers.tsx             # Context providers
│   └── ui/                       # UI primitives (Radix-based)
│
├── lib/                          # Utility libraries
│   ├── db.ts                     # Prisma client instance
│   └── utils.ts                  # Helper functions
│
├── prisma/                       # Database
│   └── schema.prisma             # Prisma schema
│
├── types/                        # TypeScript definitions
│   └── index.ts
│
├── public/                       # Static assets
│   └── images/
│
├── .github/                      # GitHub Actions
│   └── workflows/
│       ├── deploy-staging.yml    # Staging deployment
│       └── deploy-production.yml # Production deployment
│
├── app.yaml                      # GCP App Engine (Production)
├── app.staging.yaml              # GCP App Engine (Staging)
├── .gcloudignore                 # Files to exclude from deployment
├── .env                          # Environment variables (local)
├── .env.example                  # Environment template
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## 3. Git Repository Setup

### 3.1 Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Project setup with Next.js, Prisma, and Clerk"
```

### 3.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `saree-shop-backend`
3. Set visibility (Public/Private)
4. Click **Create repository**

### 3.3 Connect Local to Remote

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/saree-shop-backend.git

# Push to main branch
git push -u origin master
```

### 3.4 Add Additional Remote (Optional)

If you have multiple remotes:

```bash
# Add another remote
git remote add backend https://github.com/YOUR_USERNAME/saree-shop-backend.git

# View all remotes
git remote -v

# Push to specific remote
git push -u backend master
```

---

## 4. Branch Strategy & Protection

### 4.1 Branch Structure

```
master (main development)
    │
    ├── dev (staging/testing)
    │
    └── prod (production releases)
```

### 4.2 Create Branches

```bash
# Create and push dev branch
git checkout -b dev
git push -u origin dev

# Create and push prod branch
git checkout -b prod
git push -u origin prod

# Return to master
git checkout master
```

### 4.3 Branch Protection Rules

Navigate to: `Repository → Settings → Branches → Add branch protection rule`

#### For `dev` branch:
| Setting | Value |
|---------|-------|
| Branch name pattern | `dev` |
| Require a pull request before merging | ✅ |
| Require approvals | 1 |
| Dismiss stale pull request approvals | ✅ |
| Require deployments to succeed | ✅ (select `staging`) |
| Do not allow deletions | ✅ |

#### For `prod` branch:
| Setting | Value |
|---------|-------|
| Branch name pattern | `prod` |
| Require a pull request before merging | ✅ |
| Require approvals | 1 |
| Dismiss stale pull request approvals | ✅ |
| Require deployments to succeed | ✅ (select `production`) |
| Do not allow deletions | ✅ |

#### For `master` branch:
| Setting | Value |
|---------|-------|
| Branch name pattern | `master` |
| Require a pull request before merging | ✅ |
| Require approvals | 1 |
| Dismiss stale pull request approvals | ✅ |
| Do not allow deletions | ✅ |

### 4.4 Why Branch Protection?

| Protection | Purpose |
|------------|---------|
| **Require PR** | No direct pushes; all changes reviewed |
| **Require approvals** | At least 1 person must approve changes |
| **Dismiss stale approvals** | New commits reset previous approvals |
| **Require deployments** | Code must deploy successfully before merge |
| **No deletions** | Prevents accidental branch deletion |

---

## 5. Google Cloud Platform Setup

### 5.1 Create GCP Project

1. Go to: https://console.cloud.google.com/projectcreate
2. **Project name**: `saree-shop-backend`
3. **Organization**: Select or leave as "No organization"
4. Click **Create**
5. **Note your Project ID** (e.g., `saree-shop-backend-123456`)

### 5.2 Enable Billing

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Note: App Engine has a generous free tier

### 5.3 Enable App Engine

1. Go to: https://console.cloud.google.com/appengine
2. Click **Create Application**
3. **Select region**: Choose closest to your users
   - `asia-south1` (Mumbai) - for India
   - `us-central1` - for USA
   - `europe-west1` - for Europe
4. **Select language**: Node.js
5. **Select environment**:
   - **Standard** (Recommended) - Faster startup, scales to zero, free tier available
   - **Flexible** - For custom Docker containers, heavy workloads
6. Click **Create**

#### Standard vs Flexible Environment

| Feature | Standard | Flexible |
|---------|----------|----------|
| Startup time | Seconds | Minutes |
| Scaling | Scales to zero (cost-effective) | Minimum 1 instance always running |
| Free tier | ✅ Yes (28 instance hours/day) | ❌ No |
| Customization | Limited to supported runtimes | Full Docker support |
| Best for | Web apps, APIs, microservices | Custom runtimes, WebSockets, heavy processing |

**Recommendation**: Use **Standard** environment for Next.js applications.

### 5.4 Enable Required APIs

Go to: https://console.cloud.google.com/apis/library

Enable these APIs:
- ✅ Cloud Build API
- ✅ App Engine Admin API
- ✅ Cloud Resource Manager API

### 5.5 Create Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **+ Create Service Account**
3. **Name**: `github-deploy`
4. **Description**: `Service account for GitHub Actions deployments`
5. Click **Create and Continue**

### 5.6 Grant Service Account Permissions

Add these roles:
- `App Engine Deployer`
- `App Engine Service Admin`
- `Cloud Build Editor`
- `Service Account User`

Click **Continue** → **Done**

### 5.7 Create Service Account Key

1. Click on `github-deploy` service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Click **Create** (downloads key file)

### 5.8 Base64 Encode the Key

```bash
# Linux/Mac
base64 -w 0 ~/Downloads/saree-shop-backend-xxxxx.json

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key.json"))
```

Copy the output - this is your `GCP_SA_KEY` secret.

---

## 6. GitHub Actions CI/CD Setup

### 6.1 Add GitHub Secrets

Navigate to: `Repository → Settings → Secrets and variables → Actions`

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g., `saree-shop-backend-123456`) |
| `GCP_SA_KEY` | Base64 encoded service account JSON key |

### 6.2 Create GitHub Environments

Navigate to: `Repository → Settings → Environments`

Create two environments:

1. **staging**
   - Used for dev branch deployments
   - Optional: Add deployment protection rules

2. **production**
   - Used for prod branch deployments
   - Recommended: Add required reviewers

### 6.3 App Engine Configuration Files

#### `app.yaml` (Production)

```yaml
runtime: nodejs20
service: default
instance_class: F2

env_variables:
  NODE_ENV: production

automatic_scaling:
  min_instances: 1
  max_instances: 10

handlers:
  - url: /.*
    script: auto
    secure: always
```

#### `app.staging.yaml` (Staging)

```yaml
runtime: nodejs20
service: staging
instance_class: F1

env_variables:
  NODE_ENV: staging

automatic_scaling:
  min_instances: 0
  max_instances: 2

handlers:
  - url: /.*
    script: auto
    secure: always
```

#### `.gcloudignore`

```
.git
.gitignore
node_modules/
.env
.env.*
*.log
.next/cache/
coverage/
.nyc_output/
*.md
tests/
__tests__/
```

### 6.4 GitHub Actions Workflows

#### `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - dev

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to App Engine (Staging)
        run: gcloud app deploy app.staging.yaml --quiet --promote
```

#### `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to App Engine (Production)
        run: gcloud app deploy app.yaml --quiet --promote
```

---

## 7. Environment Variables Management

### 7.1 Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | Application URL |

### 7.2 Local Development (`.env`)

```env
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/saree-shop"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
CLERK_SECRET_KEY="sk_test_xxxxx"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 7.3 Option A: Google Secret Manager (Recommended)

Google Secret Manager provides secure, centralized storage for sensitive data like API keys and database credentials.

#### Step 1: Enable Secret Manager API

1. Go to: https://console.cloud.google.com/apis/library/secretmanager.googleapis.com
2. Click **Enable**

#### Step 2: Create Secrets

1. Go to: https://console.cloud.google.com/security/secret-manager
2. Click **+ Create Secret**
3. Create each secret:

| Secret Name | Value |
|-------------|-------|
| `DATABASE_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/saree-shop` |
| `CLERK_SECRET_KEY` | `sk_live_xxxxx` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxx` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project-id.appspot.com` |

For each secret:
- **Name**: Enter the variable name (e.g., `DATABASE_URL`)
- **Secret value**: Enter the actual value
- Click **Create Secret**

#### Step 3: Grant Service Account Access

1. Go to: https://console.cloud.google.com/iam-admin/iam
2. Find your App Engine default service account: `YOUR_PROJECT_ID@appspot.gserviceaccount.com`
3. Click **Edit** (pencil icon)
4. Add role: **Secret Manager Secret Accessor**
5. Click **Save**

#### Step 4: Access Secrets in Your Application

**Method 1: Using @google-cloud/secret-manager package**

Install the package:
```bash
npm install @google-cloud/secret-manager
```

Create `lib/secrets.ts`:
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCP_PROJECT_ID;
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();

  if (!payload) {
    throw new Error(`Secret ${secretName} not found`);
  }

  return payload;
}

// Usage in your code:
// const dbUrl = await getSecret('DATABASE_URL');
```

**Method 2: Load secrets at build time (GitHub Actions)**

Update your workflow files to fetch secrets before deployment:

```yaml
# Add after "Setup Google Cloud SDK" step
- name: Fetch secrets from Secret Manager
  run: |
    echo "DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL)" >> .env.production
    echo "CLERK_SECRET_KEY=$(gcloud secrets versions access latest --secret=CLERK_SECRET_KEY)" >> .env.production
    echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)" >> .env.production
    echo "NEXT_PUBLIC_APP_URL=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_APP_URL)" >> .env.production
```

#### Step 5: Update Service Account Permissions for GitHub Actions

Your `github-deploy` service account needs access to secrets:

1. Go to: https://console.cloud.google.com/iam-admin/iam
2. Find `github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com`
3. Add role: **Secret Manager Secret Accessor**
4. Click **Save**

#### Secret Manager Benefits

| Benefit | Description |
|---------|-------------|
| **Security** | Secrets never stored in code or version control |
| **Rotation** | Easy to update secrets without redeploying |
| **Audit** | Track who accessed which secrets and when |
| **Versioning** | Maintain history of secret values |
| **Access Control** | Fine-grained IAM permissions |

---

### 7.4 Option B: Direct in app.yaml (Quick but Less Secure)

For quick testing or non-sensitive environments, you can put variables directly in `app.yaml`:

```yaml
runtime: nodejs20
service: default

env_variables:
  NODE_ENV: production
  DATABASE_URL: "mongodb+srv://user:pass@cluster.mongodb.net/saree-shop"
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_xxxxx"
  CLERK_SECRET_KEY: "sk_live_xxxxx"
  NEXT_PUBLIC_APP_URL: "https://your-project-id.appspot.com"
```

⚠️ **Warning**: This approach has security risks:
- Secrets are visible in your repository
- Anyone with repo access can see credentials
- Secrets are stored in version control history forever

**Only use this for:**
- Local testing
- Non-production environments
- Public/non-sensitive values only

---

### 7.5 Option C: GitHub Secrets + Build-time Injection (Balanced)

Store secrets in GitHub and inject during deployment:

#### Step 1: Add Secrets to GitHub

Go to: `Repository → Settings → Secrets and variables → Actions`

Add these secrets:
| Name | Value |
|------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Base64 encoded service account key |
| `DATABASE_URL` | MongoDB connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `NEXT_PUBLIC_APP_URL` | Your app URL |

#### Step 2: Update GitHub Actions Workflow

```yaml
- name: Create environment file
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env.production
    echo "CLERK_SECRET_KEY=${{ secrets.CLERK_SECRET_KEY }}" >> .env.production
    echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}" >> .env.production
    echo "NEXT_PUBLIC_APP_URL=${{ secrets.NEXT_PUBLIC_APP_URL }}" >> .env.production

- name: Build application
  run: npm run build
```

#### Comparison of Options

| Feature | Secret Manager | app.yaml | GitHub Secrets |
|---------|---------------|----------|----------------|
| Security | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Easy Setup | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Secret Rotation | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| Audit Trail | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐ |
| Cost | Free tier available | Free | Free |

**Recommendation**: Use **Google Secret Manager** for production, **GitHub Secrets** for staging.

---

## 8. Deployment Workflow

### 8.1 Development Flow

```
Feature Branch → PR to dev → Auto-deploy to Staging → Review → Merge
                                    ↓
                            Staging URL for testing
```

### 8.2 Production Flow

```
dev branch → PR to prod → Auto-deploy to Production → Review → Merge
                                    ↓
                            Production URL live
```

### 8.3 Complete Workflow Diagram

```
┌─────────────────┐
│ Feature Branch  │
│ (your-feature)  │
└────────┬────────┘
         │ Create PR
         ▼
┌─────────────────┐      ┌─────────────────┐
│   dev branch    │─────▶│ GitHub Actions  │
│                 │      │ Deploy Staging  │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │                        ▼
         │               ┌─────────────────┐
         │               │ Staging Server  │
         │               │ (Testing)       │
         │               └─────────────────┘
         │ Create PR
         ▼
┌─────────────────┐      ┌─────────────────┐
│  prod branch    │─────▶│ GitHub Actions  │
│                 │      │ Deploy Prod     │
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Production      │
                         │ (Live)          │
                         └─────────────────┘
```

### 8.4 URLs After Deployment

| Environment | URL |
|-------------|-----|
| Staging | `https://staging-dot-PROJECT_ID.appspot.com` |
| Production | `https://PROJECT_ID.appspot.com` |

---

## 9. Verification & Testing

### 9.1 Test Branch Protection

```bash
# Try to delete protected branch (should fail)
git push origin --delete dev
# Error: Cannot delete protected branch

# Try direct push to protected branch (should fail)
git checkout dev
echo "test" >> test.txt
git add . && git commit -m "test"
git push origin dev
# Error: Protected branch requires PR
```

### 9.2 Test Deployment Pipeline

1. Create a feature branch:
   ```bash
   git checkout -b feature/test-deployment
   echo "// Test" >> lib/test.ts
   git add . && git commit -m "Test deployment"
   git push origin feature/test-deployment
   ```

2. Create PR to `dev` branch on GitHub

3. Check GitHub Actions:
   - Go to `Actions` tab
   - Verify "Deploy to Staging" workflow runs

4. Verify staging deployment:
   - Visit `https://staging-dot-PROJECT_ID.appspot.com`
   - Test functionality

5. Merge PR and repeat for `prod` branch

### 9.3 Monitor Deployments

- **GitHub Actions**: `Repository → Actions`
- **GCP Console**: https://console.cloud.google.com/appengine/services

### 9.4 Rollback (If Needed)

```bash
# List versions
gcloud app versions list

# Rollback to previous version
gcloud app versions migrate VERSION_ID --service=default
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Run linter

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:push           # Push schema to database
npm run prisma:studio         # Open Prisma Studio

# Git
git checkout -b feature/name  # Create feature branch
git push -u origin branch     # Push and set upstream

# GCP (if gcloud CLI installed)
gcloud app deploy             # Manual deploy
gcloud app logs tail          # View logs
gcloud app browse             # Open app in browser
```

### Important URLs

| Resource | URL |
|----------|-----|
| GitHub Repo | https://github.com/AkshayChavhan/saree-shop-backend |
| GitHub Actions | https://github.com/AkshayChavhan/saree-shop-backend/actions |
| GitHub Secrets | https://github.com/AkshayChavhan/saree-shop-backend/settings/secrets/actions |
| Branch Protection | https://github.com/AkshayChavhan/saree-shop-backend/settings/branches |
| GCP Console | https://console.cloud.google.com |
| App Engine | https://console.cloud.google.com/appengine |
| Secret Manager | https://console.cloud.google.com/security/secret-manager |

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Prisma Issues

```bash
# Regenerate client
npx prisma generate

# Reset database (development only!)
npx prisma db push --force-reset
```

### Deployment Fails

1. Check GitHub Actions logs
2. Verify GCP secrets are correct
3. Ensure App Engine APIs are enabled
4. Check service account permissions

---

*Last updated: January 2026*
*Author: Automated with Claude Code*
