import capsuloConfig from '@/capsulo.config';

const SHARED_DRAFT_BRANCH = 'cms-draft';

/**
 * Commit information returned by getCommits
 */
export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    login: string;
    avatarUrl: string;
  };
  date: string;
}

/**
 * Helper: Convert Uint8Array to binary string for btoa
 */
const uint8ArrayToBinaryString = (bytes: Uint8Array): string => {
  return String.fromCharCode(...bytes);
};

/**
 * Helper: Convert binary string from atob to Uint8Array
 */
const binaryStringToUint8Array = (binaryString: string): Uint8Array => {
  return Uint8Array.from(binaryString, c => c.charCodeAt(0));
};

/**
 * Standardized UTF-8 Base64 encoding for GitHub content
 * Uses TextEncoder for proper multibyte character handling
 */
const encodeContent = (content: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return btoa(uint8ArrayToBinaryString(bytes));
};

/**
 * Standardized UTF-8 Base64 decoding for GitHub content
 * Uses TextDecoder for proper multibyte character handling
 */
const decodeContent = (base64Content: string): string => {
  const binaryString = atob(base64Content.replace(/\n/g, ''));
  const bytes = binaryStringToUint8Array(binaryString);
  return new TextDecoder().decode(bytes);
};

/**
 * Centrally managed GitHub API client
 */
export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl: string;

  // Static cache for user info and branch checks to avoid redundant API hits
  private static cache: {
    username: string | null;
    usernameTokenKey: string | null;
    branchExists: Record<string, { value: boolean; timestamp: number }>;
  } = {
      username: null,
      usernameTokenKey: null,
      branchExists: {},
    };

  // Simple in-process lock for branch creation
  private static inFlightCreations: Record<string, Promise<string> | undefined> = {};

  private static CACHE_TTL = 30000; // 30 seconds

  constructor(token?: string, owner?: string, repo?: string) {
    // Priority: Explicit token > localStorage (client side) > empty
    this.token = token || (typeof window !== 'undefined' ? localStorage.getItem('github_access_token') : null) || '';

    if (!this.token) {
      console.warn('[GitHubAPI] No authentication token available');
    }

    // Priority: Explicit owner/repo > capsuloConfig
    this.owner = owner || capsuloConfig.github.owner;
    this.repo = repo || capsuloConfig.github.repo;

    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < GitHubAPI.CACHE_TTL;
  }

  /**
   * Clears the internal branch cache
   */
  public clearBranchCache(branchName?: string): void {
    if (branchName) {
      delete GitHubAPI.cache.branchExists[branchName];
    } else {
      GitHubAPI.cache.branchExists = {};
    }
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Special handling for 404 to avoid throwing on common "not found" checks
      const err = new Error(response.status === 404 ? 'Not found' : `GitHub API error: ${response.status} - ${errorText}`);
      (err as any).status = response.status;
      throw err;
    }

    return response.json();
  }

  /**
   * Retrieves the authenticated user's login name
   */
  async getAuthenticatedUser(): Promise<string> {
    // Cache key should include token to handle user switches
    const cacheKey = `user_${this.token.slice(-8)}`;
    if (GitHubAPI.cache.username && GitHubAPI.cache.usernameTokenKey === cacheKey) {
      return GitHubAPI.cache.username;
    }

    const user = await this.fetch('https://api.github.com/user');

    if (!user.login) {
      throw new Error('User login not found');
    }

    GitHubAPI.cache.username = user.login;
    GitHubAPI.cache.usernameTokenKey = cacheKey;
    return GitHubAPI.cache.username as string;
  }

  /**
   * Returns the shared draft branch name (same for all users)
   * All CMS users collaborate on the same draft branch to avoid merge conflicts.
   */
  getDraftBranch(): string {
    return SHARED_DRAFT_BRANCH;
  }

  /**
   * @deprecated Use getDraftBranch() instead. Kept for backward compatibility.
   */
  async getUserDraftBranch(): Promise<string> {
    return SHARED_DRAFT_BRANCH;
  }

  /**
   * Checks if a branch exists, using cache for performance
   */
  async checkBranchExists(branchName: string): Promise<boolean> {
    const cached = GitHubAPI.cache.branchExists[branchName];
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.value;
    }

    try {
      await this.fetch(`/git/ref/heads/${branchName}`);
      GitHubAPI.cache.branchExists[branchName] = { value: true, timestamp: Date.now() };
      return true;
    } catch (error: any) {
      GitHubAPI.cache.branchExists[branchName] = { value: false, timestamp: Date.now() };
      return false;
    }
  }

  /**
   * Ensures a branch exists. Creates it from main if it doesn't.
   * Uses an in-process lock and error handling to prevent race conditions.
   */
  async ensureBranch(branchId: string): Promise<string> {
    // 1. Check in-process lock to avoid redundant creation attempts in the same process
    const inFlight = GitHubAPI.inFlightCreations[branchId];
    if (inFlight) {
      return inFlight;
    }

    const creationPromise = (async () => {
      try {
        const exists = await this.checkBranchExists(branchId);
        if (exists) return branchId;

        const mainBranch = await this.getMainBranch();
        const ref = await this.fetch(`/git/ref/heads/${mainBranch}`);
        const sha = ref.object.sha;

        try {
          await this.fetch('/git/refs', {
            method: 'POST',
            body: JSON.stringify({
              ref: `refs/heads/${branchId}`,
              sha,
            }),
          });
        } catch (error: any) {
          // Detect "branch already exists" response (422 Unprocessable Entity or 409 Conflict)
          // and treat it as success.
          if (error.status === 422 || error.status === 409) {
            // Already exists, we can proceed
          } else {
            throw error;
          }
        }

        this.clearBranchCache(branchId);
        return branchId;
      } finally {
        // Clear the lock
        delete GitHubAPI.inFlightCreations[branchId];
      }
    })();

    GitHubAPI.inFlightCreations[branchId] = creationPromise;
    return creationPromise;
  }

  /**
   * Gets the default branch of the repository
   */
  async getMainBranch(): Promise<string> {
    const repo = await this.fetch('');
    return repo.default_branch;
  }

  /**
   * Fetches the SHA of a file on a specific branch
   */
  async getFileSha(path: string, branch: string): Promise<string | null> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      return file.sha;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /**
   * Atomic commit: ensures branch and commits file with SHA handling
   * Includes retry logic for 409 conflict errors (stale SHA)
   */
  async commitContent(options: {
    path: string;
    content: string;
    message: string;
    branch: string;
    ensureBranch?: boolean;
  }): Promise<void> {
    const { path, content, message, branch, ensureBranch = true } = options;

    if (ensureBranch) {
      await this.ensureBranch(branch);
    }

    const contentBase64 = encodeContent(content);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Always fetch fresh SHA on each attempt to avoid stale data
      const sha = await this.getFileSha(path, branch);

      try {
        await this.fetch(`/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message,
            content: contentBase64,
            branch,
            ...(sha ? { sha } : {}),
          }),
        });
        return; // Success - exit
      } catch (error: any) {
        // 409 Conflict means SHA is stale - retry with fresh SHA
        if (error.status === 409 && attempt < maxRetries) {
          console.warn(`[GitHubAPI] 409 conflict on attempt ${attempt}, retrying with fresh SHA...`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Commits multiple files in a single atomic commit using the Git Tree API.
   * This is the preferred method when you need to save multiple files together.
   */
  async commitMultipleFiles(options: {
    files: Array<{ path: string; content: string }>;
    message: string;
    branch: string;
    ensureBranch?: boolean;
  }): Promise<void> {
    const { files, message, branch, ensureBranch = true } = options;

    console.log('[commitMultipleFiles] DEBUG - received files:', files.length);
    console.log('[commitMultipleFiles] DEBUG - file paths:', files.map(f => f.path));

    if (files.length === 0) {
      console.log('[commitMultipleFiles] DEBUG - no files, returning early');
      return;
    }

    // If only one file, use the simpler single-file commit
    if (files.length === 1) {
      console.log('[commitMultipleFiles] DEBUG - only 1 file, using single-file commit');
      return this.commitContent({
        path: files[0].path,
        content: files[0].content,
        message,
        branch,
        ensureBranch,
      });
    }

    console.log('[commitMultipleFiles] DEBUG - using Git Tree API for', files.length, 'files');

    if (ensureBranch) {
      await this.ensureBranch(branch);
    }

    // Get the current commit SHA for the branch
    const branchRef = await this.fetch(`/git/ref/heads/${branch}`);
    const currentCommitSha = branchRef.object.sha;

    // Get the tree SHA from the current commit
    const currentCommit = await this.fetch(`/git/commits/${currentCommitSha}`);
    const baseTreeSha = currentCommit.tree.sha;

    // Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const blob = await this.fetch('/git/blobs', {
          method: 'POST',
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8',
          }),
        });

        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // Create a new tree with all the file changes
    const newTree = await this.fetch('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    // Create a new commit pointing to the new tree
    const newCommit = await this.fetch('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [currentCommitSha],
      }),
    });

    // Update the branch reference to point to the new commit
    await this.fetch(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    });
  }

  /**
   * Merges one branch into another
   */
  async mergeBranch(fromBranch: string, toBranch: string): Promise<void> {
    await this.fetch('/merges', {
      method: 'POST',
      body: JSON.stringify({
        base: toBranch,
        head: fromBranch,
        commit_message: `Publish changes from ${fromBranch}`,
      }),
    });
  }

  /**
   * Deletes a branch and clears cache
   */
  async deleteBranch(branchName: string): Promise<void> {
    await this.fetch(`/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    });
    this.clearBranchCache(branchName);
  }

  /**
   * Checks if the shared draft branch exists
   * @returns The draft branch name if it exists, otherwise null
   */
  async getDraftBranchIfExists(): Promise<string | null> {
    const exists = await this.checkBranchExists(SHARED_DRAFT_BRANCH);
    return exists ? SHARED_DRAFT_BRANCH : null;
  }

  /**
   * Gets and decodes file content
   */
  async getFileContent(path: string, branch: string): Promise<any> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      if (!file.content) return null;
      const content = decodeContent(file.content);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /**
   * Fetches commit history from a branch
   * @param branch Branch name to get commits from (defaults to draft branch)
   * @param page Page number for pagination (1-indexed)
   * @param perPage Number of commits per page
   */
  async getCommits(branch?: string, page: number = 1, perPage: number = 30): Promise<CommitInfo[]> {
    const targetBranch = branch || this.getDraftBranch();

    try {
      const commits = await this.fetch(
        `/commits?sha=${targetBranch}&page=${page}&per_page=${perPage}`
      );

      return commits.map((commit: any) => ({
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || commit.author?.login || 'Unknown',
          login: commit.author?.login || '',
          avatarUrl: commit.author?.avatar_url || '',
        },
        date: commit.commit.author?.date || '',
      }));
    } catch (error: any) {
      if (error.status === 404) {
        // Branch doesn't exist yet
        return [];
      }
      throw error;
    }
  }

  /**
   * Gets the files changed in a specific commit
   */
  async getCommitDetails(sha: string): Promise<{
    sha: string;
    message: string;
    author: { name: string; login: string; avatarUrl: string };
    date: string;
    parentSha: string | null;
    files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
  }> {
    const commit = await this.fetch(`/commits/${sha}`);

    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || commit.author?.login || 'Unknown',
        login: commit.author?.login || '',
        avatarUrl: commit.author?.avatar_url || '',
      },
      date: commit.commit.author?.date || '',
      parentSha: commit.parents?.[0]?.sha || null,
      files: (commit.files || []).map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
    };
  }

  /**
   * Gets file content at a specific commit SHA
   */
  async getFileContentAtCommit(path: string, sha: string): Promise<any> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${sha}`);
      if (!file.content) return null;
      const content = decodeContent(file.content);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }
}
