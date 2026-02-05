# Branch Strategy - Frontend (saakie_byknk)

## Repository
- **URL:** https://github.com/AkshayChavhan/saakie_byknk.git
- **Deployment:** Vercel

---

## Branch Overview

| Branch | Purpose | Deployed |
|--------|---------|----------|
| `main` | Production branch | Yes (Vercel) |
| `frontend-bug-fixer` | Bug fixes and patches | No |
| `add-live-data-to-home` | Feature: Live data on homepage | No |
| `admin-feature` | Feature: Admin dashboard | No |
| `signup` | Feature: Signup flow | No |
| `gcp-vm-setup` | Infrastructure: GCP VM setup | No |

---

## Merge Flow

```
feature-branch → main → Vercel (Production)
```

### Workflow

1. **Create feature branch** from `main`
2. **Develop and test** on feature branch
3. **Create PR** to merge into `main`
4. **Review and approve** PR
5. **Merge to main** - Vercel auto-deploys

---

## Branch Descriptions

### `main` (Production)
- **Status:** Protected, deployed to Vercel
- **Purpose:** Production-ready code only
- **Auto-deploy:** Yes (Vercel)

### `frontend-bug-fixer` (Development)
- **Status:** Active development branch
- **Purpose:** Bug fixes and patches
- **Merges into:** `main`

### `add-live-data-to-home` (Feature)
- **Status:** Feature development
- **Purpose:** Add live/dynamic data to homepage
- **Merges into:** `main`

### `admin-feature` (Feature)
- **Status:** Feature development
- **Purpose:** Admin dashboard functionality
- **Merges into:** `main`

### `signup` (Feature)
- **Status:** Feature development
- **Purpose:** User signup flow improvements
- **Merges into:** `main`

### `gcp-vm-setup` (Infrastructure)
- **Status:** Infrastructure setup
- **Purpose:** GCP VM configuration
- **Merges into:** `main`

---

## Rules

1. Never push directly to `main`
2. Always create PR for merging
3. Run `npm run build` before merging
4. Run `npm run lint` before merging
5. Verify Vercel deployment after merge

---

## Quick Commands

```bash
# Switch to main
git checkout main

# Create new feature branch
git checkout -b feature/your-feature-name

# Update from main
git pull origin main

# Push feature branch
git push -u origin feature/your-feature-name
```

---

*Last updated: February 2026*
