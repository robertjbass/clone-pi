#!/usr/bin/env tsx
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, mkdirSync, copyFileSync, readdirSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import chalk from "chalk";
import ora from "ora";

// ============================================================================
// Types
// ============================================================================
interface StepResult {
  success: boolean;
  message: string;
  skipped?: boolean;
}

interface Config {
  dryRun: boolean;
  verbose: boolean;
  skipPackages: boolean;
  skipConfigs: boolean;
}

// ============================================================================
// Utilities
// ============================================================================
const HOME = homedir();
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = join(SCRIPT_DIR, "..");

function log(message: string) {
  console.log(message);
}

function logStep(step: string) {
  console.log(chalk.blue(`\n==> ${step}`));
}

function logSuccess(message: string) {
  console.log(chalk.green(`    ${message}`));
}

function logWarning(message: string) {
  console.log(chalk.yellow(`    ${message}`));
}

function logError(message: string) {
  console.log(chalk.red(`    ${message}`));
}

function exec(command: string, options: { silent?: boolean; allowFail?: boolean } = {}): string {
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : "inherit",
    });
    return result || "";
  } catch (error: any) {
    if (options.allowFail) {
      return error.stdout || "";
    }
    throw error;
  }
}

function execSilent(command: string): string {
  return exec(command, { silent: true, allowFail: true });
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function fileExists(path: string): boolean {
  return existsSync(path);
}

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function copyFile(src: string, dest: string) {
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}

async function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(chalk.cyan(`${message} [y/N] `));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.setRawMode(false);
      const key = data.toString().toLowerCase();
      console.log(key);
      resolve(key === "y" || key === "yes\n");
    });
  });
}

// ============================================================================
// Installation Steps
// ============================================================================

async function checkSystem(): Promise<StepResult> {
  logStep("Checking system compatibility");

  // Check if running on ARM
  const arch = execSilent("uname -m").trim();
  if (!arch.includes("aarch64") && !arch.includes("arm")) {
    return { success: false, message: `Unsupported architecture: ${arch}. This script is for ARM-based Raspberry Pi.` };
  }
  logSuccess(`Architecture: ${arch}`);

  // Check if Armbian
  const osRelease = execSilent("cat /etc/os-release");
  if (!osRelease.includes("armbian") && !osRelease.includes("Armbian")) {
    logWarning("This doesn't appear to be Armbian. Some features may not work correctly.");
  } else {
    logSuccess("Armbian detected");
  }

  // Check Debian version
  if (osRelease.includes("trixie")) {
    logSuccess("Debian Trixie detected");
  } else {
    logWarning("Expected Debian Trixie. Some packages may differ.");
  }

  return { success: true, message: "System check passed" };
}

async function installAptPackages(config: Config): Promise<StepResult> {
  logStep("Installing APT packages");

  if (config.skipPackages) {
    return { success: true, message: "Skipped", skipped: true };
  }

  const packagesFile = join(ROOT_DIR, "configs", "packages.txt");
  if (!fileExists(packagesFile)) {
    return { success: false, message: "packages.txt not found" };
  }

  const content = readFileSync(packagesFile, "utf-8");
  const packages = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  logSuccess(`Found ${packages.length} packages to install`);

  if (config.dryRun) {
    log(chalk.gray(`    Would install: ${packages.join(", ")}`));
    return { success: true, message: "Dry run - no packages installed", skipped: true };
  }

  const spinner = ora("Updating package lists...").start();
  try {
    exec("sudo apt update", { silent: true });
    spinner.succeed("Package lists updated");
  } catch (error) {
    spinner.fail("Failed to update package lists");
    return { success: false, message: "apt update failed" };
  }

  const spinner2 = ora(`Installing ${packages.length} packages...`).start();
  try {
    exec(`sudo apt install -y ${packages.join(" ")}`, { silent: true });
    spinner2.succeed(`Installed ${packages.length} packages`);
  } catch (error: any) {
    spinner2.fail("Some packages failed to install");
    logWarning("Continuing anyway - some packages may need manual installation");
  }

  return { success: true, message: `Installed packages` };
}

async function installZsh(config: Config): Promise<StepResult> {
  logStep("Setting up ZSH with Oh-My-Zsh");

  if (config.dryRun) {
    logSuccess("Would install Oh-My-Zsh and plugins");
    return { success: true, message: "Dry run", skipped: true };
  }

  // Install Oh-My-Zsh
  const omzDir = join(HOME, ".oh-my-zsh");
  if (!fileExists(omzDir)) {
    const spinner = ora("Installing Oh-My-Zsh...").start();
    try {
      exec('sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended', { silent: true });
      spinner.succeed("Oh-My-Zsh installed");
    } catch (error) {
      spinner.fail("Failed to install Oh-My-Zsh");
      return { success: false, message: "Oh-My-Zsh installation failed" };
    }
  } else {
    logSuccess("Oh-My-Zsh already installed");
  }

  // Install Powerlevel10k
  const p10kDir = join(HOME, ".oh-my-zsh/custom/themes/powerlevel10k");
  if (!fileExists(p10kDir)) {
    const spinner = ora("Installing Powerlevel10k...").start();
    try {
      exec(`git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${p10kDir}`, { silent: true });
      spinner.succeed("Powerlevel10k installed");
    } catch (error) {
      spinner.fail("Failed to install Powerlevel10k");
    }
  } else {
    logSuccess("Powerlevel10k already installed");
  }

  // Install zsh-autosuggestions
  const autoSuggestDir = join(HOME, ".oh-my-zsh/custom/plugins/zsh-autosuggestions");
  if (!fileExists(autoSuggestDir)) {
    const spinner = ora("Installing zsh-autosuggestions...").start();
    try {
      exec(`git clone https://github.com/zsh-users/zsh-autosuggestions ${autoSuggestDir}`, { silent: true });
      spinner.succeed("zsh-autosuggestions installed");
    } catch (error) {
      spinner.fail("Failed to install zsh-autosuggestions");
    }
  } else {
    logSuccess("zsh-autosuggestions already installed");
  }

  // Install zsh-syntax-highlighting
  const syntaxHighlightDir = join(HOME, ".oh-my-zsh/custom/plugins/zsh-syntax-highlighting");
  if (!fileExists(syntaxHighlightDir)) {
    const spinner = ora("Installing zsh-syntax-highlighting...").start();
    try {
      exec(`git clone https://github.com/zsh-users/zsh-syntax-highlighting ${syntaxHighlightDir}`, { silent: true });
      spinner.succeed("zsh-syntax-highlighting installed");
    } catch (error) {
      spinner.fail("Failed to install zsh-syntax-highlighting");
    }
  } else {
    logSuccess("zsh-syntax-highlighting already installed");
  }

  // Change default shell to zsh
  const currentShell = execSilent("echo $SHELL").trim();
  if (!currentShell.includes("zsh")) {
    const spinner = ora("Setting ZSH as default shell...").start();
    try {
      exec(`sudo chsh -s $(which zsh) $USER`, { silent: true });
      spinner.succeed("ZSH set as default shell");
    } catch (error) {
      spinner.warn("Could not change default shell - you may need to do this manually");
    }
  } else {
    logSuccess("ZSH is already default shell");
  }

  return { success: true, message: "ZSH setup complete" };
}

async function installFnm(config: Config): Promise<StepResult> {
  logStep("Setting up FNM (Fast Node Manager)");

  if (config.dryRun) {
    logSuccess("Would install FNM and Node.js v24");
    return { success: true, message: "Dry run", skipped: true };
  }

  const fnmPath = join(HOME, ".local/share/fnm");
  if (!fileExists(fnmPath)) {
    const spinner = ora("Installing FNM...").start();
    try {
      exec("curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell", { silent: true });
      spinner.succeed("FNM installed");
    } catch (error) {
      spinner.fail("Failed to install FNM");
      return { success: false, message: "FNM installation failed" };
    }
  } else {
    logSuccess("FNM already installed");
  }

  // Install Node.js v24
  const spinner = ora("Installing Node.js v24...").start();
  try {
    // Source fnm and install node
    exec(`bash -c 'export PATH="${fnmPath}:$PATH" && eval "$(fnm env)" && fnm install 24 && fnm default 24'`, { silent: true });
    spinner.succeed("Node.js v24 installed");
  } catch (error) {
    spinner.fail("Failed to install Node.js");
    logWarning("You may need to install Node.js manually after restarting your shell");
  }

  return { success: true, message: "FNM setup complete" };
}

async function installUv(config: Config): Promise<StepResult> {
  logStep("Setting up UV (Python package manager)");

  if (config.dryRun) {
    logSuccess("Would install UV");
    return { success: true, message: "Dry run", skipped: true };
  }

  if (commandExists("uv")) {
    logSuccess("UV already installed");
    return { success: true, message: "Already installed" };
  }

  const spinner = ora("Installing UV...").start();
  try {
    exec("curl -LsSf https://astral.sh/uv/install.sh | sh", { silent: true });
    spinner.succeed("UV installed");
  } catch (error) {
    spinner.fail("Failed to install UV");
    return { success: false, message: "UV installation failed" };
  }

  return { success: true, message: "UV installed" };
}

async function installPipxPackages(config: Config): Promise<StepResult> {
  logStep("Installing pipx packages");

  if (config.dryRun) {
    logSuccess("Would install: llm, oterm");
    return { success: true, message: "Dry run", skipped: true };
  }

  const packages = ["llm", "oterm"];

  for (const pkg of packages) {
    const spinner = ora(`Installing ${pkg}...`).start();
    try {
      exec(`pipx install ${pkg}`, { silent: true });
      spinner.succeed(`${pkg} installed`);
    } catch (error) {
      spinner.warn(`${pkg} may already be installed or failed`);
    }
  }

  return { success: true, message: "pipx packages installed" };
}

async function installAiderChat(config: Config): Promise<StepResult> {
  logStep("Installing aider-chat via UV");

  if (config.dryRun) {
    logSuccess("Would install aider-chat");
    return { success: true, message: "Dry run", skipped: true };
  }

  const spinner = ora("Installing aider-chat...").start();
  try {
    exec(`bash -c 'export PATH="$HOME/.local/bin:$PATH" && uv tool install aider-chat'`, { silent: true });
    spinner.succeed("aider-chat installed");
  } catch (error) {
    spinner.warn("aider-chat may already be installed or failed");
  }

  return { success: true, message: "aider-chat setup complete" };
}

async function installClaudeCli(config: Config): Promise<StepResult> {
  logStep("Installing Claude CLI");

  if (config.dryRun) {
    logSuccess("Would install Claude CLI");
    return { success: true, message: "Dry run", skipped: true };
  }

  const spinner = ora("Installing Claude CLI...").start();
  try {
    exec("npm install -g @anthropic-ai/claude-code", { silent: true });
    spinner.succeed("Claude CLI installed");
  } catch (error) {
    spinner.warn("Claude CLI installation may have failed - install manually with: npm install -g @anthropic-ai/claude-code");
  }

  return { success: true, message: "Claude CLI setup complete" };
}

async function installGhostty(config: Config): Promise<StepResult> {
  logStep("Installing Ghostty terminal");

  if (config.dryRun) {
    logSuccess("Would download and install Ghostty");
    return { success: true, message: "Dry run", skipped: true };
  }

  const ghosttyPath = join(HOME, ".local/bin/ghostty");

  // Check if we have the ghostty binary in our repo
  const localGhostty = join(ROOT_DIR, "bin", "ghostty");
  if (fileExists(localGhostty)) {
    const spinner = ora("Copying Ghostty from repo...").start();
    try {
      ensureDir(join(HOME, ".local/bin"));
      copyFile(localGhostty, ghosttyPath);
      chmodSync(ghosttyPath, 0o755);
      spinner.succeed("Ghostty installed from repo");
    } catch (error) {
      spinner.fail("Failed to copy Ghostty");
    }
  } else if (fileExists(ghosttyPath)) {
    logSuccess("Ghostty already installed");
  } else {
    logWarning("Ghostty binary not found in repo - you'll need to install it manually");
    logWarning("Download from: https://github.com/ghostty-org/ghostty/releases");
  }

  return { success: true, message: "Ghostty setup complete" };
}

async function copyConfigs(config: Config): Promise<StepResult> {
  logStep("Copying configuration files");

  if (config.skipConfigs) {
    return { success: true, message: "Skipped", skipped: true };
  }

  const configsDir = join(ROOT_DIR, "configs");

  const fileMappings = [
    { src: "zshrc", dest: ".zshrc" },
    { src: "shell_common", dest: ".shell_common" },
    { src: "p10k.zsh", dest: ".p10k.zsh" },
    { src: "alacritty.toml", dest: ".config/alacritty/alacritty.toml" },
    { src: "ghostty-config", dest: ".config/ghostty/config" },
    { src: "ulauncher-settings.json", dest: ".config/ulauncher/settings.json" },
  ];

  for (const mapping of fileMappings) {
    const srcPath = join(configsDir, mapping.src);
    const destPath = join(HOME, mapping.dest);

    if (!fileExists(srcPath)) {
      logWarning(`Config file not found: ${mapping.src}`);
      continue;
    }

    if (fileExists(destPath) && !config.dryRun) {
      // Backup existing
      const backupPath = `${destPath}.backup.${Date.now()}`;
      copyFile(destPath, backupPath);
      logSuccess(`Backed up existing ${mapping.dest}`);
    }

    if (config.dryRun) {
      logSuccess(`Would copy ${mapping.src} -> ${mapping.dest}`);
    } else {
      copyFile(srcPath, destPath);
      logSuccess(`Copied ${mapping.src} -> ${mapping.dest}`);
    }
  }

  return { success: true, message: "Configs copied" };
}

async function installFonts(config: Config): Promise<StepResult> {
  logStep("Installing fonts");

  if (config.dryRun) {
    logSuccess("Would install MesloLGS NF fonts");
    return { success: true, message: "Dry run", skipped: true };
  }

  const fontsDir = join(ROOT_DIR, "fonts");
  const destFontsDir = join(HOME, ".fonts/user");

  if (!fileExists(fontsDir)) {
    logWarning("Fonts directory not found");
    return { success: true, message: "No fonts to install" };
  }

  ensureDir(destFontsDir);

  const fonts = readdirSync(fontsDir).filter((f) => f.endsWith(".ttf"));
  for (const font of fonts) {
    copyFile(join(fontsDir, font), join(destFontsDir, font));
  }

  logSuccess(`Copied ${fonts.length} font files`);

  // Update font cache
  const spinner = ora("Updating font cache...").start();
  try {
    exec("fc-cache -f", { silent: true });
    spinner.succeed("Font cache updated");
  } catch (error) {
    spinner.warn("Could not update font cache");
  }

  return { success: true, message: `${fonts.length} fonts installed` };
}

async function installCustomScripts(config: Config): Promise<StepResult> {
  logStep("Installing custom scripts");

  if (config.dryRun) {
    logSuccess("Would install custom scripts");
    return { success: true, message: "Dry run", skipped: true };
  }

  const scriptsDir = join(ROOT_DIR, "scripts");
  const destScriptsDir = join(HOME, "dev/scripts");

  if (!fileExists(scriptsDir)) {
    logWarning("Scripts directory not found");
    return { success: true, message: "No scripts to install" };
  }

  ensureDir(destScriptsDir);

  const scripts = readdirSync(scriptsDir);
  for (const script of scripts) {
    const srcPath = join(scriptsDir, script);
    const destPath = join(destScriptsDir, script);
    copyFile(srcPath, destPath);
    chmodSync(destPath, 0o755);
  }

  logSuccess(`Copied ${scripts.length} scripts`);

  return { success: true, message: `${scripts.length} scripts installed` };
}

async function applyDconfSettings(config: Config): Promise<StepResult> {
  logStep("Applying GNOME/dconf settings");

  if (config.dryRun) {
    logSuccess("Would apply dconf settings");
    return { success: true, message: "Dry run", skipped: true };
  }

  const dconfFile = join(ROOT_DIR, "configs", "dconf-settings.ini");

  if (!fileExists(dconfFile)) {
    logWarning("dconf settings file not found");
    return { success: true, message: "No dconf settings" };
  }

  const spinner = ora("Applying dconf settings...").start();
  try {
    exec(`dconf load / < "${dconfFile}"`, { silent: true });
    spinner.succeed("dconf settings applied");
  } catch (error) {
    spinner.warn("Could not apply dconf settings - GNOME may not be running");
  }

  return { success: true, message: "dconf settings applied" };
}

async function setupGitConfig(config: Config): Promise<StepResult> {
  logStep("Setting up Git configuration");

  const gitConfigPath = join(HOME, ".gitconfig");

  if (fileExists(gitConfigPath)) {
    logSuccess("Git config already exists - skipping to preserve your settings");
    return { success: true, message: "Git config preserved" };
  }

  if (config.dryRun) {
    logSuccess("Would prompt for git user info");
    return { success: true, message: "Dry run", skipped: true };
  }

  log(chalk.cyan("\n    Please enter your Git configuration:"));

  // We'll use simple defaults for now - user can configure later
  const defaultConfig = `[init]
\tdefaultBranch = main
[push]
\tautoSetupRemote = true
`;

  writeFileSync(gitConfigPath, defaultConfig);
  logSuccess("Basic git config created - run 'git config --global user.name' and 'git config --global user.email' to set your identity");

  return { success: true, message: "Git config created" };
}

async function enableServices(config: Config): Promise<StepResult> {
  logStep("Enabling system services");

  if (config.dryRun) {
    logSuccess("Would enable: ssh, smbd, nmbd, cups");
    return { success: true, message: "Dry run", skipped: true };
  }

  const services = ["ssh", "smbd", "nmbd", "cups"];

  for (const service of services) {
    const spinner = ora(`Enabling ${service}...`).start();
    try {
      exec(`sudo systemctl enable ${service}`, { silent: true });
      exec(`sudo systemctl start ${service}`, { silent: true });
      spinner.succeed(`${service} enabled and started`);
    } catch (error) {
      spinner.warn(`Could not enable ${service}`);
    }
  }

  return { success: true, message: "Services configured" };
}

async function printSummary(results: Map<string, StepResult>) {
  console.log(chalk.blue("\n" + "=".repeat(60)));
  console.log(chalk.blue("Installation Summary"));
  console.log(chalk.blue("=".repeat(60)));

  let hasErrors = false;
  for (const [step, result] of results) {
    const icon = result.success ? (result.skipped ? chalk.yellow("○") : chalk.green("✓")) : chalk.red("✗");
    console.log(`${icon} ${step}: ${result.message}`);
    if (!result.success) hasErrors = true;
  }

  console.log(chalk.blue("\n" + "=".repeat(60)));

  if (hasErrors) {
    console.log(chalk.yellow("\nSome steps had issues. Review the output above."));
  } else {
    console.log(chalk.green("\nInstallation complete!"));
  }

  console.log(chalk.cyan("\nNext steps:"));
  console.log("  1. Log out and log back in (or reboot) for shell changes to take effect");
  console.log("  2. Run 'p10k configure' to customize your prompt");
  console.log("  3. Set up your git identity:");
  console.log("     git config --global user.name 'Your Name'");
  console.log("     git config --global user.email 'your@email.com'");
  console.log("  4. Authenticate GitHub CLI: gh auth login");
  console.log("  5. Authenticate Claude CLI: claude");
  console.log("");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(chalk.blue(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║     Raspberry Pi Environment Cloner                       ║
  ║     Clone RPi 5 environment to RPi 4                      ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `));

  const args = process.argv.slice(2);
  const config: Config = {
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose"),
    skipPackages: args.includes("--skip-packages"),
    skipConfigs: args.includes("--skip-configs"),
  };

  if (config.dryRun) {
    console.log(chalk.yellow("  Running in DRY RUN mode - no changes will be made\n"));
  }

  const results = new Map<string, StepResult>();

  // Run installation steps
  const steps: [string, () => Promise<StepResult>][] = [
    ["System Check", () => checkSystem()],
    ["APT Packages", () => installAptPackages(config)],
    ["ZSH Setup", () => installZsh(config)],
    ["FNM (Node.js)", () => installFnm(config)],
    ["UV (Python)", () => installUv(config)],
    ["pipx Packages", () => installPipxPackages(config)],
    ["aider-chat", () => installAiderChat(config)],
    ["Claude CLI", () => installClaudeCli(config)],
    ["Ghostty", () => installGhostty(config)],
    ["Fonts", () => installFonts(config)],
    ["Config Files", () => copyConfigs(config)],
    ["Custom Scripts", () => installCustomScripts(config)],
    ["dconf Settings", () => applyDconfSettings(config)],
    ["Git Config", () => setupGitConfig(config)],
    ["System Services", () => enableServices(config)],
  ];

  for (const [name, step] of steps) {
    try {
      const result = await step();
      results.set(name, result);
    } catch (error: any) {
      results.set(name, { success: false, message: error.message || "Unknown error" });
      logError(`Step "${name}" failed: ${error.message}`);
    }
  }

  await printSummary(results);
}

main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
