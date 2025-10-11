import type { PageData } from './form-builder';
import { GitHubAPI } from './github-api';

export const savePageToGitHub = async (pageName: string, data: PageData): Promise<void> => {
  const github = new GitHubAPI();
  const branch = await github.getUserDraftBranch();
  const branchExists = await github.checkBranchExists(branch);
  
  if (!branchExists) {
    const mainBranch = await github.getMainBranch();
    await github.createBranch(branch, mainBranch);
    // Cache is cleared in createBranch method
  }
  
  const filePath = `src/content/pages/${pageName}.json`;
  const content = JSON.stringify(data, null, 2);
  const message = `Update ${pageName} via CMS`;
  
  await github.commitFile(filePath, content, message, branch);
};

export const publishChanges = async (): Promise<void> => {
  const github = new GitHubAPI();
  const branch = await github.getUserDraftBranch();
  const branchExists = await github.checkBranchExists(branch);
  
  if (!branchExists) throw new Error('No draft branch to publish');
  
  const mainBranch = await github.getMainBranch();
  
  await github.mergeBranch(branch, mainBranch);
  await github.deleteBranch(branch);
  // Cache is cleared in deleteBranch method
};

export const hasDraftChanges = async (): Promise<boolean> => {
  const github = new GitHubAPI();
  const branch = await github.getUserDraftBranch();
  return await github.checkBranchExists(branch);
};

export const getCurrentDraftBranch = async (): Promise<string | null> => {
  const github = new GitHubAPI();
  const branch = await github.getUserDraftBranch();
  const exists = await github.checkBranchExists(branch);
  return exists ? branch : null;
};

export const loadDraftData = async (pageName: string): Promise<PageData | null> => {
  const github = new GitHubAPI();
  const branch = await github.getUserDraftBranch();
  const branchExists = await github.checkBranchExists(branch);
  
  if (!branchExists) return null;
  
  try {
    const filePath = `src/content/pages/${pageName}.json`;
    const data = await github.getFileContent(filePath, branch);
    return data;
  } catch (error) {
    console.error('Failed to load draft data:', error);
    return null;
  }
};
