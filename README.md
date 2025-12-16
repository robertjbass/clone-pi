# Raspberry Pi Environment Cloner

Clone your Raspberry Pi 5 Armbian environment to a Raspberry Pi 4.

## What Gets Cloned

### System Packages

- GNOME desktop environment
- Alacritty terminal
- Chromium browser
- VSCodium editor
- Development tools (build-essential, git, gh, curl, etc.)
- Shell utilities (zsh, fzf, eza, zoxide, ripgrep, htop)

### Shell Environment

- ZSH with Oh-My-Zsh
- Powerlevel10k theme
- zsh-autosuggestions
- zsh-syntax-highlighting
- Custom functions and aliases

### Development Tools

- FNM (Fast Node Manager) with Node.js v24
- UV (Python package manager)
- pipx with llm and oterm
- aider-chat
- Claude CLI

### Configurations

- Alacritty terminal config
- Ghostty terminal config
- Ulauncher settings
- GNOME/dconf settings
- Git config (basic - you'll set your identity)

### Fonts

- MesloLGS NF (for Powerlevel10k)

## Prerequisites

On your new Raspberry Pi 4:

1. Install Armbian (Debian Trixie recommended)
2. Complete initial setup (username, password)
3. Connect to the internet
4. Have sudo access

## Quick Start

```bash
# 1. Install git (if not already installed)
sudo apt update && sudo apt install -y git

# 2. Clone this repository
git clone https://github.com/robertjbass/clone-pi.git ~/dev/clone-pi

# 3. Run the installer
cd ~/dev/clone-pi
./clone.sh
```

## Usage Options

```bash
# Full installation
./clone.sh

# Preview what will be done (no changes made)
./clone.sh --dry-run

# Skip package installation (if you've already installed them)
./clone.sh --skip-packages

# Skip config copying (only install software)
./clone.sh --skip-configs

# Show help
./clone.sh --help
```

## Post-Installation Steps

After the installation completes:

1. **Reboot** or log out and back in for shell changes to take effect

2. **Configure Powerlevel10k** (optional):

   ```bash
   p10k configure
   ```

3. **Set up Git identity**:

   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
   ```

4. **Authenticate GitHub CLI**:

   ```bash
   gh auth login
   ```

5. **Authenticate Claude CLI**:
   ```bash
   claude
   ```

## Hardware Notes

### RPi 5 vs RPi 4 Differences

- Both use ARM64 (aarch64) architecture
- Both can run Armbian with the same packages
- Fan control script path may differ (check `/sys/class/hwmon/`)
- Performance will be lower on RPi 4

### What's NOT Cloned

- Secrets and API keys (you'll need to re-authenticate services)
- SSH keys (generate new ones or copy manually)
- Ollama (excluded - install separately if needed)
- Machine-specific settings (hostname, IP, etc.)

## Directory Structure

```
clone-pi/
├── clone.sh              # Bootstrap script (run this)
├── package.json          # npm dependencies
├── tsconfig.json         # TypeScript config
├── src/
│   └── install.ts        # Main installer (TypeScript)
├── bin/
│   └── ghostty           # Ghostty terminal binary (~31MB)
├── configs/
│   ├── packages.txt      # APT packages to install
│   ├── dconf-settings.ini # GNOME settings
│   ├── zshrc             # ZSH configuration
│   ├── shell_common      # Shared shell config
│   ├── p10k.zsh          # Powerlevel10k config
│   ├── alacritty.toml    # Alacritty config
│   ├── ghostty-config    # Ghostty config
│   └── ulauncher-settings.json
├── fonts/
│   └── MesloLGS*.ttf     # Nerd fonts for p10k
└── scripts/
    └── fan               # Fan control script
```

**Note:** The `bin/ghostty` binary is ~31MB. If you want a smaller repo, you can exclude it and download Ghostty separately from [ghostty.org](https://ghostty.org).

## Troubleshooting

### "Command not found" after installation

Log out and back in, or run:

```bash
source ~/.zshrc
```

### Packages failed to install

Some packages may not be available. Run:

```bash
sudo apt install -f
```

### Fonts not showing correctly

Run:

```bash
fc-cache -f
```

Then restart your terminal.

### FNM/Node not working

Make sure your shell config sources `.shell_common`:

```bash
source ~/.shell_common
```

## Customization

### Adding more packages

Edit `configs/packages.txt` - one package per line, comments start with `#`.

### Modifying shell config

Edit `configs/zshrc` before running the installer.

### Changing GNOME settings

Edit `configs/dconf-settings.ini` or export your current settings:

```bash
dconf dump / > configs/dconf-settings.ini
```

## License

MIT

# clone-pi
