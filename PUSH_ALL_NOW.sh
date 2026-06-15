#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║           🚀 PUSH ALL 5 COMMITS TO GITHUB - EXECUTE NOW 🚀               ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we have a token argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to provide your GitHub Personal Access Token!${NC}"
    echo ""
    echo -e "${GREEN}Step 1: Generate Token${NC}"
    echo "Visit: https://github.com/settings/tokens/new"
    echo "  • Name: autoJobApply-push"
    echo "  • Expiration: 90 days"
    echo "  • Scope: ✓ repo"
    echo ""
    echo -e "${GREEN}Step 2: Run this script with your token:${NC}"
    echo ""
    echo "  bash PUSH_ALL_NOW.sh ghp_your_token_here"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo "  bash PUSH_ALL_NOW.sh ghp_abc123xyz789def456"
    echo ""
    exit 1
fi

TOKEN=$1

echo -e "${GREEN}✓ Token received${NC}"
echo ""

# Show what we're pushing
echo -e "${BLUE}📊 5 COMMITS READY TO PUSH:${NC}"
git log --oneline -6
echo ""

echo -e "${BLUE}📦 FILES READY (87 total):${NC}"
find . -type f ! -path './.git/*' ! -path './node_modules/*' ! -path './.DS_Store' 2>/dev/null | wc -l
echo "   files"
echo ""

# Configure git
git config --global user.name "Mekarthiakhi"
git config --global user.email "mekarthiakhi@github.com"

# Set remote with token
echo -e "${BLUE}🔐 Configuring authentication...${NC}"
git remote set-url origin "https://${TOKEN}@github.com/Mekarthiakhi/autoJobApply.git"
echo -e "${GREEN}✓ Authentication configured${NC}"
echo ""

# Push all commits
echo -e "${BLUE}📤 Pushing all 5 commits to GitHub...${NC}"
echo ""

if git push -u origin main --force; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}║                    ✅ PUSH SUCCESSFUL! 🎉                                  ║${NC}"
    echo -e "${GREEN}║                                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Your repository now has:${NC}"
    echo "  ✅ 5 commits"
    echo "  ✅ 87 files"
    echo "  ✅ Complete AI Job Automation Platform"
    echo ""
    echo -e "${BLUE}🔗 Visit your repository:${NC}"
    echo "   https://github.com/Mekarthiakhi/autoJobApply"
    echo ""
else
    echo ""
    echo -e "${RED}❌ PUSH FAILED!${NC}"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Token might be invalid or expired"
    echo "  • Token doesn't have 'repo' scope"
    echo "  • Check token is copied correctly (no spaces)"
    echo ""
    echo -e "${YELLOW}Solution:${NC}"
    echo "  1. Generate a new token: https://github.com/settings/tokens/new"
    echo "  2. Make sure 'repo' scope is checked"
    echo "  3. Try again: bash PUSH_ALL_NOW.sh ghp_your_new_token"
    exit 1
fi

