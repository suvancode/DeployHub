import { GitErrorDiagnosis } from '../../src/types/api';

/**
 * Sanitizes a repository name or URL by replacing spaces with hyphens
 * and ensuring valid characters for GitHub.
 */
export function sanitizeRepoName(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
}

/**
 * Sanitizes a Git remote URL by replacing unencoded spaces in the repository path with hyphens.
 * E.g. "https://github.com/user/Build Lab.git" -> "https://github.com/user/Build-Lab.git"
 */
export function sanitizeRemoteUrl(url: string): string {
  if (!url) return url;
  // Replace unencoded spaces or %20 in the repo segment
  return url.replace(/([^/:]+)\s+([^/:]+)/g, '$1-$2').replace(/%20/g, '-');
}

/**
 * Diagnoses raw Git output and returns a structured, human-readable error diagnosis
 * with actionable solutions and automated fix options.
 */
export function diagnoseGitError(
  rawError: string,
  currentRemoteUrl?: string
): GitErrorDiagnosis {
  const combined = (rawError || '').trim();
  const url = (currentRemoteUrl || '').trim();

  // 1. Malformed URL / Spaces in URL
  const hasSpacesInUrl = url.includes(' ') || url.includes('%20');
  const isMalformedUrl =
    combined.includes('Malformed input to a URL function') ||
    combined.includes('URL rejected') ||
    combined.includes('malformed URL') ||
    hasSpacesInUrl;

  if (isMalformedUrl) {
    const fixedUrl = sanitizeRemoteUrl(url || 'https://github.com/user/repo.git');
    return {
      title: 'Malformed Remote URL (Spaces Detected)',
      whatIsError: `The Git remote URL "${url}" contains invalid spaces. Git's network transfer protocol (libcurl) strictly rejects spaces with the error "Malformed input to a URL function". GitHub repository names cannot have spaces and use hyphens instead.`,
      suggestion: `Fix the remote URL by replacing spaces with hyphens ("${fixedUrl}").`,
      rawError: combined,
      canAutoFix: true,
      autoFixLabel: '🔧 Auto-Fix Remote URL & Push Code',
      autoFixType: 'FIX_MALFORMED_URL',
      suggestedUrl: fixedUrl,
    };
  }

  // 2. Repository Not Found (404)
  if (
    combined.includes('Repository not found') ||
    combined.includes('does not appear to be a git repository') ||
    combined.includes('The requested URL returned error: 404')
  ) {
    return {
      title: 'Repository Not Found on GitHub (404)',
      whatIsError: `GitHub reported that the repository does not exist, was renamed, or the authenticated account does not have read permissions.`,
      suggestion: `Verify that the repository exists on GitHub and that you are logged into the correct GitHub account.`,
      rawError: combined,
      canAutoFix: false,
    };
  }

  // 3. Permission Denied / Authentication Failed (403)
  if (
    combined.includes('Permission to') && combined.includes('denied') ||
    combined.includes('Authentication failed') ||
    combined.includes('The requested URL returned error: 403') ||
    combined.includes('fatal: could not read Username')
  ) {
    return {
      title: 'GitHub Authentication / Permission Denied (403)',
      whatIsError: `GitHub rejected write access. The currently active account does not have permission to push commits to this repository.`,
      suggestion: `Switch to the GitHub account that owns this repository using the account switcher in the top bar, or authenticate with 'gh auth login'.`,
      rawError: combined,
      canAutoFix: false,
    };
  }

  // 4. Remote has newer commits (rejected non-fast-forward)
  if (
    combined.includes('[rejected]') ||
    combined.includes('fetch first') ||
    combined.includes('non-fast-forward') ||
    combined.includes('Updates were rejected because the remote contains work')
  ) {
    return {
      title: 'Remote Has Newer Commits (Push Rejected)',
      whatIsError: `The remote repository contains changes that are not present in your local branch. Git prevents pushing to avoid accidentally overwriting work.`,
      suggestion: `Run 'git pull origin <branch>' or rebase your local commits onto the remote branch before pushing.`,
      rawError: combined,
      canAutoFix: false,
    };
  }

  // 5. Default Fallback
  return {
    title: 'Git Operation Failed',
    whatIsError: combined || 'Git command returned a non-zero exit code.',
    suggestion: 'Review your Git configuration, network connection, and remote repository URL.',
    rawError: combined,
    canAutoFix: false,
  };
}
