#!/bin/bash
set -e

# Install jq and yq
sudo apt-get update && sudo apt-get install -y jq
sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 && sudo chmod +x /usr/local/bin/yq

# Install AzCopy
wget -qO- https://aka.ms/downloadazcopy-v10-linux | tar xz --strip-components=1 -C /tmp
sudo mv /tmp/azcopy /usr/local/bin/

# Verify installations
echo ""
echo "============================================"
echo "  ☁️  Azure Cert Prep — Lab Environment"
echo "============================================"
echo ""
echo "Tools installed:"
echo "  ✅ Azure CLI    $(az --version 2>/dev/null | head -1)"
echo "  ✅ Bicep        $(az bicep version 2>/dev/null)"
echo "  ✅ PowerShell   $(pwsh --version 2>/dev/null)"
echo "  ✅ AzCopy       $(azcopy --version 2>/dev/null)"
echo "  ✅ jq           $(jq --version 2>/dev/null)"
echo "  ✅ Node.js      $(node --version 2>/dev/null)"
echo ""
echo "Next steps:"
echo "  1. Login to Azure:  az login --use-device-code"
echo "  2. Verify:          az account show --output table"
echo "  3. Start:           Open docs/az-104/01-identity/challenge-01.md"
echo ""
echo "Happy learning! 🚀"
