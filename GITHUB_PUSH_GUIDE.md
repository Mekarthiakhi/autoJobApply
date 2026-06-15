# 📤 Push to GitHub Repository

## Quick Start (Copy-Paste Ready)

### Prerequisites
- GitHub Personal Access Token (PAT)
- Git installed
- Access to terminal

---

## 🔐 Step 1: Create GitHub Personal Access Token

1. Visit: https://github.com/settings/tokens/new
2. Fill in the details:
   - **Token name**: `autoJobApply-push`
   - **Expiration**: 90 days (or as needed)
   - **Select scopes**: Check `repo` (full control of repositories)
3. Click **"Generate token"**
4. **Copy the token immediately** (you won't see it again!)

**Token format**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 📤 Step 2: Push to GitHub

Run this command (replace `YOUR_GITHUB_TOKEN` with your actual token):

```bash
cd /workspace/ai-job-automation

# Set up git remote with authentication
git remote set-url origin https://YOUR_GITHUB_TOKEN@github.com/Mekarthiakhi/autoJobApply.git

# Push to main branch
git push -u origin main
```

**Example**:
```bash
git remote set-url origin https://ghp_abc123xyz789@github.com/Mekarthiakhi/autoJobApply.git
git push -u origin main
```

---

## ✅ Step 3: Verify

Visit your repository: https://github.com/Mekarthiakhi/autoJobApply

You should see:
- ✅ 79 files
- ✅ All source code
- ✅ Documentation files
- ✅ Docker configuration
- ✅ GitHub Actions workflows

---

## 📦 What Gets Pushed

### Backend
- Express.js API with TypeScript
- PostgreSQL database schema
- Job discovery services
- AI matching engine (OpenAI)
- Telegram bot integration
- Authentication & security middleware
- Complete service layer

### Frontend
- React application with Vite
- Glassmorphism UI components
- Modern responsive design
- Authentication flows
- Dashboard & job management

### DevOps
- Docker & Docker Compose
- GitHub Actions CI/CD
- Deployment configurations
- Environment templates

### Documentation
- README.md (comprehensive)
- DEPLOYMENT.md (production guide)
- CONTRIBUTING.md (dev guidelines)
- API documentation
- Troubleshooting guides

---

## 🔄 If Repository Already Has Content

If the repository already has files, use force push:

```bash
git push -u origin main --force
```

⚠️ **Warning**: This will overwrite existing content. Only use if you're replacing all content.

---

## 🛠️ Troubleshooting

### ❌ "Permission denied" Error
```
Solution: Verify your token has 'repo' scope
```

### ❌ "Authentication failed" Error
```
Solution: Double-check the token is copied correctly
```

### ❌ "fatal: remote origin already exists"
```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://YOUR_TOKEN@github.com/Mekarthiakhi/autoJobApply.git

# Push
git push -u origin main
```

---

## ✨ After Push

### 1. Configure GitHub Secrets for CI/CD
Go to: https://github.com/Mekarthiakhi/autoJobApply/settings/secrets/actions

Add these secrets:
```
DEPLOY_KEY = <your-ssh-deploy-key>
DEPLOY_HOST = <your-vps-ip-or-domain>
```

### 2. Enable GitHub Actions
- Go to **Actions** tab
- Workflows will auto-run on push

### 3. Clone & Deploy
```bash
git clone https://github.com/Mekarthiakhi/autoJobApply.git
cd autoJobApply
docker-compose up -d
```

---

## 📝 Git Commands Reference

```bash
# Check status
git status

# View commits
git log --oneline

# View remote
git remote -v

# Change remote URL
git remote set-url origin <new-url>

# Push to different branch
git push origin branch-name
```

---

## 🎯 Next Steps

1. ✅ Push to GitHub
2. ✅ Verify all files are there
3. ✅ Set up GitHub Secrets
4. ✅ Enable GitHub Actions
5. ✅ Deploy to VPS (see DEPLOYMENT.md)

---

**Need Help?**
- Check GitHub Status: https://www.githubstatus.com
- GitHub Docs: https://docs.github.com
- Repository: https://github.com/Mekarthiakhi/autoJobApply
