# DeployHub

> **Configure once, push manually, deploy automatically.**

DeployHub is a secure Windows desktop application built with Electron, React, Vite, TypeScript, and Tailwind CSS. It automates repetitive initial Git and GitHub configuration for local project folders and links Vercel deployment once per project.

---

## 🔒 The Manual-Push Guarantee

**DeployHub NEVER pushes code automatically.**
- You maintain 100% control over commits, branch publication, and releases.
- DeployHub inspects your local repository, sets up the remote, verifies your GitHub account, and displays the exact manual command:
  ```bash
  git push -u origin main
  ```
- After you run `git push` manually in your terminal, Vercel automatically detects the push via its native GitHub Git integration and triggers production or preview builds.

---

## ✨ Features

- **Dashboard**:
  - Real-time project overview with status metrics (Configured, Awaiting Setup, GitHub Connected, Vercel Linked).
  - Search and filter projects by status, repository, or directory.
  - Quick actions: Open in Explorer, Open in Terminal (Windows Terminal / PowerShell / Cmd), Open GitHub, Open live production URL.
  - Safe removal from registry without touching local code files or Git history.
- **Deep Project Inspection**:
  - Non-destructive read-only scanner.
  - Detects Git status, active branch (never assumes `main`), existing remotes, commit count, and uncommitted changes.
  - Detects project frameworks (Next.js, Vite/React, Vue, Svelte, Astro, Nuxt, Remix, static HTML) and package managers (`npm`, `pnpm`, `yarn`, `bun`).
  - Sensitive files detection (`.env`, `.env.local`, `*.pem`, `id_rsa`) to prevent secret leakage.
  - Monorepo and nested workspace detection (`pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, `apps/*`, `packages/*`).
- **Git Automation Manager**:
  - Safe initialization (`git init -b <branch>`).
  - Proposed `.gitignore` preview and editing.
  - User-confirmed initial commit (only when 0 commits exist).
  - Safe remote configuration without silent replacement.
- **GitHub Account Verification**:
  - Official GitHub CLI (`gh`) integration.
  - Zero plain-text credentials stored in config files.
  - Verified account identity display and switching guidance.
  - Mode A: Create new repository (defaults to **Private** visibility).
  - Mode B: Connect existing user repository with permission check.
- **Vercel One-Time Setup**:
  - Vercel CLI detection and login guidance.
  - Project linking (`vercel link`).
  - Monorepo root directory selector.
  - Environment variables manager with secure masking.
  - Optional initial preview/production deployment.
- **Local-First Architecture**:
  - No cloud databases (no Supabase, Firebase, MongoDB).
  - Versioned JSON registry with atomic file writes and automatic corruption recovery.
  - Export and import registry without credentials.
  - Structured local diagnostic logs with automatic token/credential redaction.

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 33, React 18, Vite 6, TypeScript 5, Tailwind CSS
- **Automation CLIs**: Git CLI, GitHub CLI (`gh`), Vercel CLI (`vercel`)
- **Testing**: Vitest (Unit & Integration tests)
- **Packaging**: Electron Builder (NSIS Windows Installer & Portable executable)

---

## 🚀 Getting Started

### Prerequisites
Make sure the following tools are installed:
1. **Node.js**: v18+ (tested on Node v22.20.0)
2. **Git**: [git-scm.com](https://git-scm.com/)
3. **GitHub CLI (`gh`)**:
   ```powershell
   winget install --id GitHub.cli
   gh auth login
   ```
4. **Vercel CLI (`vercel`)**:
   ```powershell
   npm install -g vercel
   vercel login
   ```

### Installation
Clone this repository and install dependencies:
```bash
git clone https://github.com/adityasing9/DeployHub.git
cd DeployHub
npm install
```

### Running in Development
Start Vite and Electron concurrently:
```bash
npm run electron:dev
```

### Running Tests
Execute the unit and integration test suite:
```bash
npm run test
```

### Building & Packaging for Windows
Build the production bundle and generate the Windows installer:
```bash
npm run dist
```
Or create an unpacked portable directory:
```bash
npm run pack
```

---

## 🛡️ Security Architecture

1. **Context Isolation**: `contextIsolation: true`, `nodeIntegration: false`, and `webSecurity: true`.
2. **Strict Content Security Policy**: Denies unauthorized external scripts and framing.
3. **No Shell Injections**: All child processes (`git`, `gh`, `vercel`) spawn with array arguments, avoiding shell string parsing.
4. **Log Redaction**: Automatic masking of GitHub personal tokens (`gho_***`, `ghp_***`, `github_pat_***`), Vercel tokens, bearer auth headers, and passwords.
5. **Private By Default**: All new GitHub repositories default to private visibility.

---

## 📄 License
MIT License.
