# Raspberry Pi SSH Setup

Guide for setting up passwordless SSH access to a Raspberry Pi from macOS.

## Prerequisites

- Raspberry Pi with SSH enabled
- Pi's IP address (find via router admin or `ping raspberrypi.local`)
- Pi's username and password

## Steps

### 1. Initial SSH Connection

Connect to the Pi for the first time using username and IP address:

```bash
ssh username@192.168.86.xxx
```

Enter the password when prompted. You'll also be asked to save the host fingerprint:

```
The authenticity of host '192.168.86.xxx' can't be established.
ED25519 key fingerprint is SHA256:xxxxxxxxxxxxx
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Type `yes` to save the fingerprint to `~/.ssh/known_hosts`.

### 2. Add SSH Config Entry

Add an entry to `~/.ssh/config` on your Mac:

```
Host piname
HostName 192.168.86.xxx
User username
SetEnv TERM=xterm-256color
```

The `SetEnv TERM=xterm-256color` line ensures proper terminal compatibility with Ghostty.

After this, you can connect with just:

```bash
ssh piname
```

### 3. (Optional) Add Shell Function

Add a convenience function to `~/.zshrc`:

```bash
function piname() {
  ssh piname
}
```

Then reload the config:

```bash
source ~/.zshrc
```

### 4. Set Up Passwordless Login

Copy your SSH public key to the Pi:

```bash
ssh-copy-id piname
```

Enter your password one last time. After this, future connections will not require a password.

## Current Pi Inventory

| Host | IP Address | User |
|------|------------|------|
| rpi5 | 192.168.86.230 | rpi5 |
| rpi4 | 192.168.86.236 | rpi4 |
