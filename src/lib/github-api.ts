import type { PageData } from './form-builder';

const DRAFT_BRANCH_PREFIX = 'cms-draft-';

const getGitHubToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('github_access_token');
};

let _repoOwner = 'oriolmontcreu';
let _repoName = 'capsulo';

export const setRepoInfo = (owner: string, repo: string) => {
  _repoOwner = owner;
  _repoName = repo;
};

const getRepoInfo = () => {
  return { owner: _repoOwner, repo: _repoName };
};

export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.token = token || getGitHubToken() || '';
    const { owner, repo } = getRepoInfo();
    this.owner = owner;
    this.repo = repo;
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getMainBranch() {
    const repo = await this.fetch('');
    return repo.default_branch;
  }

  async getFileSha(path: string, branch: string) {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      return file.sha;
    } catch {
      return null;
    }
  }

  async createBranch(branchName: string, fromBranch: string = 'main') {
    const ref = await this.fetch(`/git/ref/heads/${fromBranch}`);
    const sha = ref.object.sha;

    await this.fetch('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });

    return branchName;
  }

  async commitFile(path: string, content: string, message: string, branch: string) {
    const sha = await this.getFileSha(path, branch);
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));

    await this.fetch(`/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
  }

  async mergeBranch(fromBranch: string, toBranch: string) {
    await this.fetch('/merges', {
      method: 'POST',
      body: JSON.stringify({
        base: toBranch,
        head: fromBranch,
        commit_message: `Publish changes from ${fromBranch}`,
      }),
    });
  }

  async deleteBranch(branchName: string) {
    await this.fetch(`/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    });
  }

  async listBranches() {
    const branches = await this.fetch('/branches');
    return branches
      .filter((b: any) => b.name.startsWith(DRAFT_BRANCH_PREFIX))
      .map((b: any) => b.name);
  }

  async getFileContent(path: string, branch: string): Promise<any> {
    try {
      const file = await this.fetch(`/contents/${path}?ref=${branch}`);
      const content = atob(file.content.replace(/\n/g, ''));
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to get file content: ${path}`, error);
      return null;
    }
  }
}

export const generateDraftBranchName = () => {
  const hash = Math.random().toString(36).substring(2, 10);
  return `${DRAFT_BRANCH_PREFIX}${hash}`;
};

export const getDraftBranch = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cms-draft-branch');
};

export const setDraftBranch = (branch: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cms-draft-branch', branch);
};

export const clearDraftBranch = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cms-draft-branch');
};
