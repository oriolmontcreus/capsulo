import { useEffect, useState } from "react";
import { GitHubAPI } from "@/lib/github-api";

interface UseRecentCommitsResult {
  commits: string[];
  isLoading: boolean;
  error: string | null;
}

export function useRecentCommits(
  token: string | null,
  enabled = true
): UseRecentCommitsResult {
  const [commits, setCommits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(enabled && token)) {
      return;
    }

    const fetchCommits = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const githubApi = new GitHubAPI(token);
        const commitHistory = await githubApi.getCommits(undefined, 1, 5);
        const commitMessages = commitHistory.map((commit) => commit.message);
        setCommits(commitMessages);
      } catch (err) {
        console.error("Failed to fetch recent commits:", err);
        setError("Failed to load commit history");
        setCommits([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [token, enabled]);

  return { commits, isLoading, error };
}
