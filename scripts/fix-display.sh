#!/bin/bash
# Fix GNOME desktop not starting after install

set -e

echo "Fixing any interrupted package installations..."
sudo dpkg --configure -a

echo "Installing GNOME display manager..."
sudo apt update && sudo apt install -y gnome-core gdm3

echo "Setting graphical target as default..."
sudo systemctl set-default graphical.target

echo "Enabling gdm3..."
sudo systemctl enable gdm3

echo ""
echo "Done! Run 'sudo reboot' to start GNOME desktop."
