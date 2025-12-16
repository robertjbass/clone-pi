#!/bin/bash
# Fix GNOME desktop not starting after install

echo "Fixing any interrupted package installations..."
sudo dpkg --configure -a

echo "Updating package lists..."
sudo apt update

echo "Installing GNOME desktop and display manager..."
if ! sudo apt install -y gnome-core gdm3; then
    echo ""
    echo "=========================================="
    echo "GNOME installation failed!"
    echo "Try running these commands manually:"
    echo ""
    echo "  sudo apt install -y gnome-core"
    echo "  sudo apt install -y gdm3"
    echo ""
    echo "If a specific package fails, you can skip it and continue."
    echo "=========================================="
    exit 1
fi

echo "Setting graphical target as default..."
sudo systemctl set-default graphical.target

echo "Enabling gdm3..."
sudo systemctl enable gdm3

echo ""
echo "=========================================="
echo "Done! Run 'sudo reboot' to start GNOME desktop."
echo "=========================================="
