# Raspberry Pi Armbian Bootstrap

The ideal starting point for your Raspberry Pi configuration.

## What Gets Installed

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

### Download Armbian

Download Armbian for your Raspberry Pi:
- **RPi 4:** https://www.armbian.com/rpi4b/
- **RPi 5:** https://www.armbian.com/rpi5b/

Choose the **Trixie Minimal** version - this installer will set up GNOME desktop for you.

### Flash the Image

Use one of these tools to flash the Armbian image to your SD card:

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) (recommended)
- [balenaEtcher](https://etcher.balena.io/)
- [USBImager](https://bztsrc.gitlab.io/usbimager/)

### Initial Setup

On your Raspberry Pi:

1. Boot from the SD card
2. Complete initial setup (username, password)
3. Connect to the internet
4. Have sudo access

### SSH Access (Optional)

See [raspberry-pi-setup.md](raspberry-pi-setup.md) for instructions on setting up passwordless SSH access from your Mac or Linux machine.

## Quick Start

```bash
# 1. Install git (if not already installed)
sudo apt update && sudo apt install -y git

# 2. Clone this repository
git clone https://github.com/robertjbass/clone-pi.git ~/dev/clone-pi

# 3. Run the installer
cd ~/dev/clone-pi
./install.sh
```

## Usage Options

```bash
# Full installation
./install.sh

# Preview what will be done (no changes made)
./install.sh --dry-run

# Skip package installation (if you've already installed them)
./install.sh --skip-packages

# Skip config copying (only install software)
./install.sh --skip-configs

# Show help
./install.sh --help
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
   git config --global user.name "Your Name" && git config --global user.email "you@example.com"
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

### Supported Devices

- Raspberry Pi 4 and 5 (ARM64/aarch64)
- Both can run Armbian with the same packages
- Fan control script path may differ (check `/sys/class/hwmon/`)

### What's NOT Installed

- Secrets and API keys (you'll need to re-authenticate services)
- SSH keys (generate new ones or copy manually)
- Ollama (excluded - install separately if needed)
- Machine-specific settings (hostname, IP, etc.)

## Directory Structure

```
clone-pi/
├── install.sh            # Bootstrap script (run this)
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
