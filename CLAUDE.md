# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clone-pi is a bootstrap tool for setting up Raspberry Pi devices running Armbian. It consists of a bash bootstrap script and a TypeScript installer that handles package installation, shell setup, configuration files, and developer tools.

## Commands

```bash
# Run the full installer (bootstrap + TypeScript installer)
./install.sh

# Preview mode - see what would be done without making changes
./install.sh --dry-run

# Skip APT package installation
./install.sh --skip-packages

# Skip configuration file copying
./install.sh --skip-configs

# Run TypeScript installer directly (after bootstrap)
npm run setup
npm run setup:dry-run
```

## Architecture

**Two-stage installation:**
1. `install.sh` - Bash bootstrap that installs prerequisites (curl, git, unzip, fnm, Node.js) then calls the TypeScript installer
2. `src/install.ts` - Main installer with 15 installation steps running sequentially, each returning a `StepResult`

**Key patterns in install.ts:**
- Steps are async functions taking a `Config` object and returning `StepResult { success, message, skipped? }`
- Uses `ora` for spinners, `chalk` for colored output
- `exec()` wrapper around `execSync` with `silent` and `allowFail` options
- Dry-run support: each step checks `config.dryRun` before making changes

**Config files (`configs/`):**
- `packages.txt` - APT packages (one per line, `#` comments)
- `dconf-settings.ini` - GNOME settings loaded via `dconf load /`
- Shell configs: `zshrc`, `shell_common`, `p10k.zsh`
- Terminal configs: `alacritty.toml`, `ghostty-config`

## Target Environment

- ARM64 (aarch64) Raspberry Pi running Armbian
- Debian Trixie expected (warnings shown for other versions)
- Installs: ZSH + Oh-My-Zsh + Powerlevel10k, FNM + Node.js v24, UV (Python), Claude CLI
