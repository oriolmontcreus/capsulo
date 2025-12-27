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
