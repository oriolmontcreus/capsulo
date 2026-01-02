import type { PageData, GlobalData } from './form-builder';
import { GitHubAPI } from './github-api';

/**
 * Unified interface for saving content to GitHub
 */
interface SaveContentOptions {
  path: string;
  data: any;
  message: string;
  token?: string;
}

/**
 * Core internal function to save content to GitHub draft branches
 * @returns The name of the draft branch
 */
async function saveToGitHub(options: SaveContentOptions): Promise<string> {
  const { path, data, message, token } = options;
  const github = new GitHubAPI(token);

  const draftBranch = github.getDraftBranch();
  const content = JSON.stringify(data, null, 2);

  await github.commitContent({
    path,
    content,
    message,
    branch: draftBranch,
    ensureBranch: true
  });

  return draftBranch;
}

/**
 * Saves a page draft to GitHub
 * @param commitMessage Optional custom commit message
 * @returns The name of the draft branch
 */
export const savePageToGitHub = async (pageName: string, data: PageData, token?: string, commitMessage?: string): Promise<string> => {
  return await saveToGitHub({
    path: `src/content/pages/${pageName}.json`,
    data,
    message: commitMessage || `Update ${pageName} via CMS`,
    token
  });
};

/**
 * Saves global variables draft to GitHub
 * @param commitMessage Optional custom commit message
 * @returns The name of the draft branch
 */
export const saveGlobalsToGitHub = async (data: GlobalData, token?: string, commitMessage?: string): Promise<string> => {
  return await saveToGitHub({
    path: `src/content/globals.json`,
    data,
    message: commitMessage || `Update global variables via CMS`,
    token
  });
};

/**
 * Batch commit multiple pages and optionally globals in a single atomic commit.
 * This prevents creating multiple commits when publishing multiple changes.
 */
export const batchCommitChanges = async (
  changes: {
    pages: Array<{ pageName: string; data: PageData }>;
    globals?: GlobalData;
  },
  commitMessage: string,
  token?: string
): Promise<void> => {
  console.log('[batchCommitChanges] DEBUG - starting batch commit');
  const github = new GitHubAPI(token);
  const draftBranch = github.getDraftBranch();

  const files: Array<{ path: string; content: string }> = [];

  // Add page files
  for (const { pageName, data } of changes.pages) {
    const fileName = pageName === 'home' ? 'index' : pageName;
    console.log('[batchCommitChanges] DEBUG - adding page file:', `src/content/pages/${fileName}.json`);
    files.push({
      path: `src/content/pages/${fileName}.json`,
      content: JSON.stringify(data, null, 2),
    });
  }

  // Add globals file if provided
  if (changes.globals) {
    console.log('[batchCommitChanges] DEBUG - adding globals file');
    files.push({
      path: `src/content/globals.json`,
      content: JSON.stringify(changes.globals, null, 2),
    });
  }

  console.log('[batchCommitChanges] DEBUG - total files to commit:', files.length);
  console.log('[batchCommitChanges] DEBUG - file paths:', files.map(f => f.path));

  if (files.length === 0) return;

  console.log('[batchCommitChanges] DEBUG - calling commitMultipleFiles');
  await github.commitMultipleFiles({
    files,
    message: commitMessage,
    branch: draftBranch,
    ensureBranch: true,
  });
  console.log('[batchCommitChanges] DEBUG - commitMultipleFiles completed');
};

/**
 * Publishes all changes from the user's draft branch to main
 */
export const publishChanges = async (token?: string): Promise<void> => {
  const github = new GitHubAPI(token);
  const branch = github.getDraftBranch();
  const branchExists = await github.checkBranchExists(branch);

  if (!branchExists) throw new Error('No draft branch to publish');

  const mainBranch = await github.getMainBranch();

  await github.mergeBranch(branch, mainBranch);
  await github.deleteBranch(branch);
};

/**
 * Checks if the user has any unpublished draft changes
 */
export const hasDraftChanges = async (token?: string): Promise<boolean> => {
  const github = new GitHubAPI(token);
  const branch = github.getDraftBranch();
  return await github.checkBranchExists(branch);
};

/**
 * Returns the name of the current user's draft branch if it exists
 */
export const getCurrentDraftBranch = async (token?: string): Promise<string | null> => {
  const github = new GitHubAPI(token);
  const branch = github.getDraftBranch();
  const exists = await github.checkBranchExists(branch);
  return exists ? branch : null;
};

/**
 * Loads page data from the user's draft branch
 */
export const loadDraftData = async (pageName: string, token?: string): Promise<PageData | null> => {
  const github = new GitHubAPI(token);
  const branch = github.getDraftBranch();

  return await github.getFileContent(`src/content/pages/${pageName}.json`, branch);
};

/**
 * Loads global variables from the user's draft branch
 */
export const loadGlobalsFromGitHub = async (token?: string): Promise<GlobalData | null> => {
  const github = new GitHubAPI(token);
  const branch = github.getDraftBranch();

  const data = await github.getFileContent(`src/content/globals.json`, branch);
  return data;
};
