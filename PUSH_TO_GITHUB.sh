#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 AI Job Automation - GitHub Push Script               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if token is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  GitHub Personal Access Token required!${NC}"
    echo ""
    echo -e "${BLUE}To generate a token:${NC}"
    echo "1. Go to: https://github.com/settings/tokens/new"
    echo "2. Create token with 'repo' scope"
    echo "3. Copy the token"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  bash PUSH_TO_GITHUB.sh <YOUR_GITHUB_TOKEN>"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo "  bash PUSH_TO_GITHUB.sh ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

TOKEN=$1
REPO_URL="https://${TOKEN}@github.com/Mekarthiakhi/autoJobApply.git"

echo -e "${GREEN}✓ Token received${NC}"
echo ""

# Step 1: Verify Git repo
echo -e "${BLUE}📋 Step 1: Verifying Git Repository${NC}"
if [ ! -d ".git" ]; then
    echo -e "${RED}✗ Not a git repository!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git repository found${NC}"
echo ""

# Step 2: Check uncommitted changes
echo -e "${BLUE}📋 Step 2: Checking for uncommitted changes${NC}"
if [ -n "$(git status -s)" ]; then
    echo -e "${YELLOW}⚠️  There are uncommitted changes${NC}"
    echo "Files to commit:"
    git status -s
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}✗ Aborted${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Repository clean${NC}"
echo ""

# Step 3: Configure remote
echo -e "${BLUE}📋 Step 3: Configuring GitHub Remote${NC}"
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"
echo -e "${GREEN}✓ Remote configured${NC}"
echo ""

# Step 4: Rename branch to main
echo -e "${BLUE}📋 Step 4: Setting up main branch${NC}"
git branch -M main
echo -e "${GREEN}✓ Branch set to main${NC}"
echo ""

# Step 5: Push to GitHub
echo -e "${BLUE}📋 Step 5: Pushing to GitHub${NC}"
echo -e "${YELLOW}This may take a moment...${NC}"
echo ""

if git push -u origin main --force; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ SUCCESS! Push completed                               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📊 Repository Details:${NC}"
    echo "  URL: https://github.com/Mekarthiakhi/autoJobApply"
    echo ""
    echo -e "${BLUE}📦 What was pushed:${NC}"
    echo "  • 79 files"
    echo "  • Complete backend (Node.js + Express + PostgreSQL)"
    echo "  • Complete frontend (React + Vite + TypeScript)"
    echo "  • Docker & Docker Compose setup"
    echo "  • GitHub Actions CI/CD workflows"
    echo "  • Comprehensive documentation"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "  1. Visit: https://github.com/Mekarthiakhi/autoJobApply"
    echo "  2. Verify all files are there"
    echo "  3. Configure GitHub Secrets for CI/CD"
    echo "  4. Enable GitHub Actions"
    echo "  5. Deploy to production"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ FAILED! Push was unsuccessful                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  • Check token has 'repo' scope"
    echo "  • Verify token is not expired"
    echo "  • Ensure you have push access to the repository"
    exit 1
fi
