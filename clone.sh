#!/bin/bash
# ============================================================================
# Raspberry Pi Environment Cloner - Bootstrap Script
# ============================================================================
# This script bootstraps the environment cloning process.
# Run this after a fresh Armbian installation on your RPi 4.
#
# Prerequisites:
#   - Fresh Armbian installation
#   - Internet connection
#   - sudo access
#
# Usage:
#   ./clone.sh              # Full installation
#   ./clone.sh --dry-run    # Preview what will be done
#   ./clone.sh --help       # Show help
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================================
# Helper Functions
# ============================================================================

print_banner() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║                                                           ║"
    echo "  ║     Raspberry Pi Environment Cloner                       ║"
    echo "  ║     Bootstrap Script                                      ║"
    echo "  ║                                                           ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Bootstrap the Raspberry Pi environment cloning process."
    echo ""
    echo "Options:"
    echo "  --dry-run         Preview what will be done without making changes"
    echo "  --skip-packages   Skip APT package installation"
    echo "  --skip-configs    Skip configuration file copying"
    echo "  --verbose         Show more detailed output"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full installation"
    echo "  $0 --dry-run          # Preview mode"
    echo "  $0 --skip-packages    # Skip apt packages (if already installed)"
    echo ""
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Do not run this script as root. Run as your normal user with sudo access."
        exit 1
    fi
}

check_internet() {
    log_info "Checking internet connection..."
    if ! ping -c 1 google.com &> /dev/null; then
        log_error "No internet connection. Please connect to the internet and try again."
        exit 1
    fi
    log_success "Internet connection OK"
}

check_sudo() {
    log_info "Checking sudo access..."
    if ! sudo -v &> /dev/null; then
        log_error "You need sudo access to run this script."
        exit 1
    fi
    log_success "sudo access OK"
}

install_git() {
    if command -v git &> /dev/null; then
        log_success "git is already installed"
        return 0
    fi

    log_info "Installing git..."
    sudo apt update
    sudo apt install -y git
    log_success "git installed"
}

install_curl() {
    if command -v curl &> /dev/null; then
        log_success "curl is already installed"
        return 0
    fi

    log_info "Installing curl..."
    sudo apt update
    sudo apt install -y curl
    log_success "curl installed"
}

install_fnm() {
    FNM_PATH="$HOME/.local/share/fnm"

    if [ -d "$FNM_PATH" ]; then
        log_success "FNM is already installed"
    else
        log_info "Installing FNM (Fast Node Manager)..."
        curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
        log_success "FNM installed"
    fi

    # Source FNM for this session
    export PATH="$FNM_PATH:$PATH"
    eval "$(fnm env)"
}

install_node() {
    log_info "Checking Node.js installation..."

    # Make sure fnm is in path
    FNM_PATH="$HOME/.local/share/fnm"
    export PATH="$FNM_PATH:$PATH"
    eval "$($FNM_PATH/fnm env 2>/dev/null || echo '')"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js $NODE_VERSION is installed"

        # Check if it's v24
        if [[ "$NODE_VERSION" == v24* ]]; then
            return 0
        fi
    fi

    log_info "Installing Node.js v24..."
    fnm install 24
    fnm default 24
    eval "$(fnm env)"
    log_success "Node.js $(node --version) installed"
}

install_npm_deps() {
    log_info "Installing npm dependencies..."
    cd "$SCRIPT_DIR"

    # Source fnm again to ensure node is available
    FNM_PATH="$HOME/.local/share/fnm"
    export PATH="$FNM_PATH:$PATH"
    eval "$(fnm env)"

    npm install
    log_success "npm dependencies installed"
}

run_installer() {
    log_info "Running TypeScript installer..."
    cd "$SCRIPT_DIR"

    # Source fnm
    FNM_PATH="$HOME/.local/share/fnm"
    export PATH="$FNM_PATH:$PATH"
    eval "$(fnm env)"

    # Pass through any arguments
    npx tsx src/install.ts "$@"
}

# ============================================================================
# Main
# ============================================================================

main() {
    # Parse arguments
    ARGS=()
    for arg in "$@"; do
        case $arg in
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                ARGS+=("$arg")
                ;;
        esac
    done

    print_banner

    # Pre-flight checks
    check_root
    check_sudo
    check_internet

    echo ""
    log_info "Starting bootstrap process..."
    echo ""

    # Install prerequisites
    install_curl
    install_git
    install_fnm
    install_node

    # Install npm dependencies
    install_npm_deps

    echo ""
    log_success "Bootstrap complete! Starting main installer..."
    echo ""

    # Run the TypeScript installer with any passed arguments
    run_installer "${ARGS[@]}"
}

# Run main with all arguments
main "$@"
