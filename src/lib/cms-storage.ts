import type { PageData } from './form-builder';
import { GitHubAPI, getDraftBranch, setDraftBranch, clearDraftBranch, generateDraftBranchName } from './github-api';

export const savePageToGitHub = async (pageName: string, data: PageData): Promise<void> => {
  const github = new GitHubAPI();
  let branch = getDraftBranch();
  
  if (!branch) {
    branch = generateDraftBranchName();
    const mainBranch = await github.getMainBranch();
    await github.createBranch(branch, mainBranch);
    setDraftBranch(branch);
  }
  
  const filePath = `src/content/pages/${pageName}.json`;
  const content = JSON.stringify(data, null, 2);
  const message = `Update ${pageName} via CMS`;
  
  await github.commitFile(filePath, content, message, branch);
};

export const publishChanges = async (): Promise<void> => {
  const branch = getDraftBranch();
  
  if (!branch) throw new Error('No draft branch to publish');
  
  const github = new GitHubAPI();
  const mainBranch = await github.getMainBranch();
  
  await github.mergeBranch(branch, mainBranch);
  await github.deleteBranch(branch);
  
  clearDraftBranch();
};

export const hasDraftChanges = (): boolean => getDraftBranch() !== null;

export const getCurrentDraftBranch = (): string | null => getDraftBranch();

export const loadDraftData = async (pageName: string): Promise<PageData | null> => {
  const branch = getDraftBranch();
  if (!branch) return null;
  
  try {
    const github = new GitHubAPI();
    const filePath = `src/content/pages/${pageName}.json`;
    const data = await github.getFileContent(filePath, branch);
    return data;
  } catch (error) {
    console.error('Failed to load draft data:', error);
    return null;
  }
};
