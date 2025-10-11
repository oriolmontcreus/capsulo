# User-Based Draft System: Multi-Device & Collaborative Editing

## 🎯 The Problem We Solved

**Old System (localStorage)**:
- ❌ Draft branch name stored in browser's localStorage
- ❌ Can't access drafts from another device
- ❌ Can't see drafts if you clear browser data
- ❌ No way for multiple users to have separate drafts

**Example Scenario**:
```
User edits on laptop → saves draft → "cms-draft-a3f8k2"
User switches to phone → CMS shows "no drafts" 😢
```

## ✅ New System (GitHub-Based)

**How It Works**:
1. Fetch the authenticated GitHub username from the GitHub API
2. Use username in branch name: `cms-draft-{username}`
3. Check if that branch exists on GitHub (not localStorage)
4. Each user gets exactly **one draft branch** that persists everywhere

**Example**:
```
User "oriolmontcreu" logs in on laptop
→ Creates/uses branch "cms-draft-oriolmontcreu"
→ Makes changes and saves

User "oriolmontcreu" logs in on phone
→ Automatically detects "cms-draft-oriolmontcreu" exists
→ Loads their pending changes ✅

Another user "jane" logs in
→ Creates/uses their own branch "cms-draft-jane"
→ Both users can work independently ✅
```

## 🔧 Technical Changes

### 1. GitHub API (`src/lib/github-api.ts`)

**Added Methods**:
```typescript
// Fetch authenticated user's GitHub username
async getAuthenticatedUser(): Promise<string>

// Generate user-specific draft branch name
async getUserDraftBranch(): Promise<string>

// Check if a branch exists on GitHub
async checkBranchExists(branchName: string): Promise<boolean>
```

**Removed**:
- `getDraftBranch()` - no longer using localStorage
- `setDraftBranch()` - no longer needed
- `clearDraftBranch()` - no longer needed

### 2. CMS Storage (`src/lib/cms-storage.ts`)

**Before**:
```typescript
const branch = getDraftBranch(); // localStorage
if (!branch) {
  branch = generateDraftBranchName(); // random hash
  setDraftBranch(branch); // save to localStorage
}
```

**After**:
```typescript
const github = new GitHubAPI();
const branch = await github.getUserDraftBranch(); // cms-draft-username
const branchExists = await github.checkBranchExists(branch); // check GitHub

if (!branchExists) {
  await github.createBranch(branch, mainBranch);
}
```

All functions now:
- ✅ Query GitHub for branch existence
- ✅ Use username-based branch names
- ✅ Work across all devices

### 3. CMS Manager (`src/components/cms/CMSManager.tsx`)

**Changed**:
```typescript
// Before
if (hasDraftChanges()) { ... } // synchronous localStorage check

// After
const hasDraft = await hasDraftChanges(); // async GitHub API check
if (hasDraft) { ... }
```

## 🎨 User Experience

### Single User, Multiple Devices
```
Monday - Laptop:
  Make changes → saved to "cms-draft-yourname"

Tuesday - Phone:
  Open CMS → Automatically loads changes from "cms-draft-yourname"
  
Wednesday - Laptop:
  Continue editing → Same branch, all synced ✅
```

### Multiple Users Collaborating
```
User A (oriolmontcreu):
  Branch: "cms-draft-oriolmontcreu"
  Makes changes to homepage

User B (jane):
  Branch: "cms-draft-jane"
  Makes changes to about page

Both can work independently without conflicts! 🎉
```

## 📊 Benefits

1. **Multi-Device Access**: Edit from laptop, phone, tablet - always see your drafts
2. **Data Persistence**: Drafts stored in GitHub, not browser storage
3. **Collaboration Ready**: Each user has their own draft space
4. **No Conflicts**: User-specific branches prevent overwriting each other's work
5. **Transparency**: Can see all draft branches with `cms-draft-*` prefix

## 🔍 How It Works Under the Hood

### First Time User Saves
```
1. User makes changes in CMS
2. Click "Save Draft"
3. GitHubAPI.getAuthenticatedUser() → fetches "oriolmontcreu"
4. GitHubAPI.getUserDraftBranch() → returns "cms-draft-oriolmontcreu"
5. GitHubAPI.checkBranchExists() → false (doesn't exist yet)
6. GitHubAPI.createBranch() → creates "cms-draft-oriolmontcreu" from main
7. GitHubAPI.commitFile() → commits changes to the branch
```

### User Returns Later (Same or Different Device)
```
1. User opens CMS
2. CMSManager calls hasDraftChanges()
3. GitHubAPI.getUserDraftBranch() → "cms-draft-oriolmontcreu"
4. GitHubAPI.checkBranchExists() → true ✅
5. loadDraftData() → fetches content from that branch
6. User sees their pending changes!
```

### Publishing Changes
```
1. User clicks "Publish"
2. GitHubAPI.getUserDraftBranch() → "cms-draft-oriolmontcreu"
3. GitHubAPI.mergeBranch() → merges into main
4. GitHubAPI.deleteBranch() → deletes "cms-draft-oriolmontcreu"
5. Changes are live!
```

## 🚀 Future Enhancements

**Possible additions**:
- Show list of all users with pending drafts
- Preview other users' draft branches before merging
- Add timestamps to see when drafts were last updated
- Notifications when another user publishes changes

## 📝 API Calls Made

### On CMS Load:
1. `GET /user` - Get authenticated username
2. `GET /repos/:owner/:repo/git/ref/heads/cms-draft-{username}` - Check if draft exists
3. `GET /repos/:owner/:repo/contents/:path?ref=cms-draft-{username}` - Load draft content

### On Save:
1. `GET /user` - Get authenticated username (cached after first call)
2. `GET /repos/:owner/:repo/git/ref/heads/cms-draft-{username}` - Check if branch exists
3. `POST /repos/:owner/:repo/git/refs` - Create branch (if doesn't exist)
4. `PUT /repos/:owner/:repo/contents/:path` - Commit file

### On Publish:
1. `POST /repos/:owner/:repo/merges` - Merge draft to main
2. `DELETE /repos/:owner/:repo/git/refs/heads/cms-draft-{username}` - Delete draft branch

## ✨ No localStorage Required!

Everything is now stored and retrieved from GitHub. The only localStorage items remaining are:
- `github_access_token` - The user's authentication token (necessary for API calls)

No more device-specific data! 🎉

