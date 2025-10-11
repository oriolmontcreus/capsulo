# GitHub-Based CMS Setup (Fully Static)

## Overview

This CMS uses GitHub branches as a draft/publish workflow - **all from the browser, no server needed!**

1. **Make changes** → Browser commits to draft branch (`cms-draft-xxxxx`) via GitHub API
2. **Preview** → See changes in CMS (not live on site yet)
3. **Publish** → Browser merges draft to main → Your GitHub Actions rebuild the site

## Setup Steps

### 1. Configure Public Environment Variables

Create a `.env` file:

```env
PUBLIC_GITHUB_OWNER=your-github-username
PUBLIC_GITHUB_REPO=capsulo
```

**Important**: Use `PUBLIC_` prefix so Astro exposes these to the browser.

### 2. GitHub Fine-Grained Token

Your existing auth already uses fine-grained tokens! Users need these permissions:

- **Repository Contents**: Read and Write
- **Metadata**: Read (automatically included)

### 3. GitHub Actions for Auto-Rebuild

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: capsulo
          directory: dist
```

Add secrets in GitHub repo settings:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## How It Works (100% Static)

### Draft Branch Workflow

1. User makes first change → **Browser** creates branch `cms-draft-abc123` via GitHub API
2. Branch name stored in localStorage
3. All changes → **Browser** commits directly to GitHub via API
4. Click "Publish" → **Browser** merges to main → GitHub Actions rebuilds

### Why This Is Better

✅ **Fully static** - No server/API routes needed  
✅ **Host anywhere** - Works on any static host  
✅ **Direct to GitHub** - No middleman  
✅ **Uses existing auth** - Fine-grained tokens you already have  
✅ **Security** - Token in browser, but user controls their own token

## Security

- Each user uses their own GitHub token (from your existing OAuth)
- Token must have write access to the repository
- Users without tokens can't make changes
- Draft branches isolated from main
- Token stored in secure httpOnly cookies

## Testing Locally

```bash
npm run dev
```

Visit `http://localhost:4321/admin` and make changes. They commit directly to GitHub!

## Production Workflow

1. Content editor logs in (gets GitHub token via OAuth)
2. Makes changes in CMS
3. Changes commit to draft branch (directly from browser)
4. Editor clicks "Publish"
5. Draft merges to main (directly from browser)
6. GitHub Actions detects push to main
7. Rebuilds and deploys to Cloudflare Pages
8. Changes live in ~1-2 minutes

## Advantages Over Server-Side Approach

- ✅ No API routes = simpler
- ✅ No server needed = cheaper hosting
- ✅ No Cloudflare-specific code = host anywhere
- ✅ GitHub handles everything = reliable
- ✅ You control rebuild logic = flexible

## Troubleshooting

### "Not authenticated" error
- User needs to log in via GitHub OAuth
- Check token is in cookies

### "Failed to create branch" error  
- Verify `PUBLIC_GITHUB_OWNER` and `PUBLIC_GITHUB_REPO`
- Check token has Contents: Write permission

### Changes don't trigger rebuild
- Check GitHub Actions workflow exists
- Verify secrets are set correctly
- Check Actions tab in GitHub for errors
