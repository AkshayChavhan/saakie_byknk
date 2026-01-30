# Complete GCP Setup Guide for Saree Shop Backend

A comprehensive guide to deploy your Express backend on Google Cloud Platform (GCP) Free Tier.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create GCP Account](#create-gcp-account)
3. [Create Project](#create-project)
4. [Deployment Options](#deployment-options)
5. [Deploy to Cloud Run](#deploy-to-cloud-run)
6. [Deploy to Compute Engine VM](#deploy-to-compute-engine-vm)
7. [Set Up Billing Alerts](#set-up-billing-alerts)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

**What You Need:**

| Item | Required | Purpose |
|------|----------|---------|
| Google Account (Gmail) | ✅ Yes | GCP login |
| Credit/Debit Card | ✅ Yes | Verification only (not charged within free tier) |
| Phone Number | ✅ Yes | Account verification |
| Domain Name | ❌ Optional | Custom URL (can use GCP-provided URL) |

---

## Create GCP Account

### Step 1: Navigate to GCP
```
URL: https://cloud.google.com
```

### Step 2: Start Free Trial
1. Click **"Get started for free"** button
2. Sign in with your Google account

### Step 3: Accept Terms
1. Select your country
2. Accept Terms of Service
3. Click "Continue"

### Step 4: Set Up Billing
1. Enter payment method (Credit/Debit card)
2. Fill billing address
3. Click "Start my free trial"

> **Note:** You won't be charged if you stay within free tier limits. GCP gives you:
> - **$300 free credits** for 90 days
> - **Always Free** tier resources (ongoing)

### Step 5: Verify Identity
- Complete phone verification if prompted
- Verify email if required

---

## Create Project

### Step 1: Access Console
```
URL: https://console.cloud.google.com
```

### Step 2: Create New Project
1. Click the project dropdown (top-left, next to "Google Cloud")
2. Click **"New Project"**
3. Enter project details:
   - **Project name:** `saree-shop-backend`
   - **Organization:** Leave as default (or select if you have one)
   - **Location:** Leave as default
4. Click **"Create"**

### Step 3: Select Project
1. Wait for project creation (notification bell will show progress)
2. Click **"Select Project"** in the notification
3. Or use dropdown → Select `saree-shop-backend`

---

## Deployment Options

### Option A: Cloud Run (Recommended)

| Pros | Cons |
|------|------|
| ✅ Scales to zero (no idle cost) | ❌ Cold starts (1-2 sec on first request) |
| ✅ 2 million requests/month free | ❌ Less control over infrastructure |
| ✅ Auto SSL/HTTPS | ❌ Request timeout limit (60 min max) |
| ✅ Easy deployment (1 command) | |
| ✅ No server management | |

**Free Tier Limits:**
- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds
- 1 GB network egress (North America)

### Option B: Compute Engine VM

| Pros | Cons |
|------|------|
| ✅ Full control over server | ❌ Runs 24/7 (uses quota even when idle) |
| ✅ WebSocket support | ❌ Manual SSL setup |
| ✅ Persistent processes | ❌ Manual scaling |
| ✅ No cold starts | ❌ Server maintenance required |

**Free Tier Limits:**
- 1 e2-micro instance/month (US regions only)
- 30 GB standard persistent disk
- 1 GB network egress (excluding China/Australia)

---

## Deploy to Cloud Run

### Step 1: Install Google Cloud CLI

**On Linux/WSL:**
```bash
# Download and install
curl https://sdk.cloud.google.com | bash

# Restart shell
exec -l $SHELL

# Initialize gcloud
gcloud init
```

**On macOS:**
```bash
# Using Homebrew
brew install google-cloud-sdk

# Initialize
gcloud init
```

**On Windows:**
1. Download installer from: https://cloud.google.com/sdk/docs/install
2. Run installer
3. Open Google Cloud SDK Shell
4. Run `gcloud init`

### Step 2: Authenticate
```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project saree-shop-backend
```

### Step 3: Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 4: Prepare Backend Code
```bash
# Navigate to backend directory
cd saree-shop-backend

# Build TypeScript
npm run build

# Generate Prisma client
npx prisma generate
```

### Step 5: Deploy
```bash
gcloud run deploy saree-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --set-env-vars "DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/db" \
  --set-env-vars "CLERK_SECRET_KEY=sk_live_xxx" \
  --set-env-vars "CLERK_WEBHOOK_SECRET=whsec_xxx" \
  --set-env-vars "STRIPE_SECRET_KEY=sk_live_xxx" \
  --set-env-vars "STRIPE_WEBHOOK_SECRET=whsec_xxx" \
  --set-env-vars "RAZORPAY_KEY_ID=rzp_live_xxx" \
  --set-env-vars "RAZORPAY_KEY_SECRET=xxx" \
  --set-env-vars "CLOUDINARY_CLOUD_NAME=xxx" \
  --set-env-vars "CLOUDINARY_API_KEY=xxx" \
  --set-env-vars "CLOUDINARY_API_SECRET=xxx" \
  --set-env-vars "FRONTEND_URL=https://your-frontend.vercel.app"
```

### Step 6: Get Deployment URL
After successful deployment, you'll see:
```
Service [saree-backend] revision [saree-backend-00001-xxx] has been deployed
Service URL: https://saree-backend-xxxxx-uc.a.run.app
```

Save this URL - you'll need it for frontend configuration.

### Step 7: Verify Deployment
```bash
# Test health endpoint
curl https://saree-backend-xxxxx-uc.a.run.app/health

# Expected response:
# {"status":"ok"}
```

---

## Deploy to Compute Engine VM

### Step 1: Create VM Instance

1. Go to **Compute Engine** → **VM instances**
   ```
   URL: https://console.cloud.google.com/compute/instances
   ```

2. Click **"Create Instance"**

3. Configure Instance:

   | Setting | Value |
   |---------|-------|
   | Name | `saree-backend-vm` |
   | Region | `us-west1` (Oregon) or `us-central1` (Iowa) or `us-east1` (South Carolina) |
   | Zone | Any (e.g., `us-central1-a`) |
   | Machine configuration | General purpose |
   | Series | E2 |
   | Machine type | `e2-micro` (2 vCPU, 1 GB memory) - **FREE TIER** |

4. Boot Disk Configuration:
   - Click **"Change"**
   - Operating system: **Ubuntu**
   - Version: **Ubuntu 22.04 LTS**
   - Boot disk type: **Standard persistent disk**
   - Size: **30 GB** (max free)
   - Click **"Select"**

5. Firewall:
   - ✅ Allow HTTP traffic
   - ✅ Allow HTTPS traffic

6. Click **"Create"**

### Step 2: Connect to VM

**Option A: Browser SSH (Easiest)**
- Click **"SSH"** button next to your VM instance

**Option B: gcloud CLI**
```bash
gcloud compute ssh saree-backend-vm --zone=us-central1-a
```

### Step 3: Install System Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials (for native modules)
sudo apt install -y build-essential

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx

# Verify installations
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
pm2 -v     # Should show 5.x.x
nginx -v   # Should show nginx/1.x.x
```

### Step 4: Clone and Setup Backend
```bash
# Navigate to home directory
cd ~

# Clone your backend repository
git clone https://github.com/YOUR_USERNAME/saree-shop-backend.git

# Navigate to project
cd saree-shop-backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Generate Prisma client
npx prisma generate
```

### Step 5: Configure Environment Variables
```bash
# Create .env file
nano .env
```

Add all environment variables:
```env
# Database
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/saree-shop"

# Clerk Authentication
CLERK_SECRET_KEY="sk_live_xxxx"
CLERK_WEBHOOK_SECRET="whsec_xxxx"

# Stripe Payments
STRIPE_SECRET_KEY="sk_live_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"

# Razorpay Payments
RAZORPAY_KEY_ID="rzp_live_xxxx"
RAZORPAY_KEY_SECRET="xxxx"
RAZORPAY_WEBHOOK_SECRET="xxxx"

# Cloudinary (Image uploads)
CLOUDINARY_CLOUD_NAME="xxxx"
CLOUDINARY_API_KEY="xxxx"
CLOUDINARY_API_SECRET="xxxx"

# Application
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://your-frontend.vercel.app"
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Step 6: Start Application with PM2
```bash
# Start the application
pm2 start dist/index.js --name saree-backend

# Save PM2 process list
pm2 save

# Configure PM2 to start on system boot
pm2 startup

# Copy and run the command PM2 provides (looks like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### Step 7: Configure Nginx Reverse Proxy
```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/default
```

Replace contents with:
```nginx
server {
    listen 80;
    server_name YOUR_VM_EXTERNAL_IP;

    # Increase body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Get External IP
1. Go to VM instances page
2. Copy the **External IP** address
3. Test: `http://EXTERNAL_IP/health`

### Step 9: Set Up SSL (Optional but Recommended)

**If you have a domain:**
```bash
# Point your domain's A record to VM's external IP first
# Then run:
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured by default)
sudo certbot renew --dry-run
```

**Reserve Static IP (to prevent IP changes):**
1. Go to VPC Network → External IP addresses
2. Find your VM's IP → Click "Reserve"

---

## Set Up Billing Alerts

### Step 1: Access Budgets
```
URL: https://console.cloud.google.com/billing/budgets
```

### Step 2: Create Budget
1. Click **"Create Budget"**
2. Budget name: `Free Tier Monitor`
3. Budget amount: **$1** (or $5 for safety)
4. Click **"Next"**

### Step 3: Set Alert Thresholds
Add alerts at:
- 50% of budget ($0.50)
- 90% of budget ($0.90)
- 100% of budget ($1.00)

### Step 4: Configure Notifications
1. Check **"Email alerts to billing admins and users"**
2. Optionally add Pub/Sub topic for programmatic alerts
3. Click **"Finish"**

---

## Troubleshooting

### Cloud Run Issues

**Problem: Deployment fails**
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

**Problem: Service not starting**
```bash
# Check service logs
gcloud run services logs read saree-backend --region us-central1
```

**Problem: Cold start too slow**
- Set `--min-instances 1` (will incur costs)
- Or optimize Docker image size

### VM Issues

**Problem: Can't connect via SSH**
```bash
# Check firewall rules
gcloud compute firewall-rules list

# Ensure SSH is allowed
gcloud compute firewall-rules create allow-ssh --allow tcp:22
```

**Problem: Application not accessible**
```bash
# Check if app is running
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Problem: Out of disk space**
```bash
# Check disk usage
df -h

# Clear npm cache
npm cache clean --force

# Clear PM2 logs
pm2 flush
```

---

## Quick Reference

### Useful Commands

```bash
# Cloud Run
gcloud run services list
gcloud run services describe saree-backend --region us-central1
gcloud run services logs read saree-backend --region us-central1

# VM
gcloud compute instances list
gcloud compute ssh saree-backend-vm --zone=us-central1-a

# PM2
pm2 status
pm2 logs saree-backend
pm2 restart saree-backend
pm2 monit

# Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### Important URLs

| Resource | URL |
|----------|-----|
| GCP Console | https://console.cloud.google.com |
| Compute Engine | https://console.cloud.google.com/compute/instances |
| Cloud Run | https://console.cloud.google.com/run |
| Billing | https://console.cloud.google.com/billing |
| Cloud SDK Install | https://cloud.google.com/sdk/docs/install |

---

## Next Steps

After deployment:
1. Update frontend `NEXT_PUBLIC_API_URL` environment variable
2. Update webhook URLs in Clerk, Stripe, and Razorpay dashboards
3. Test all API endpoints
4. Monitor billing alerts
