#!/bin/bash
# Cleanup all Azure Cert Prep lab resources
# WARNING: This deletes ALL resource groups matching the pattern

echo "⚠️  This will delete ALL resource groups starting with 'rg-az104-'"
echo ""

# List matching resource groups
GROUPS=$(az group list --query "[?starts_with(name, 'rg-az104-')].name" -o tsv)

if [ -z "$GROUPS" ]; then
  echo "No resource groups found matching 'rg-az104-*'"
  exit 0
fi

echo "Found resource groups:"
echo "$GROUPS" | while read g; do echo "  - $g"; done
echo ""

read -p "Delete all? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 0
fi

echo "$GROUPS" | while read g; do
  echo "Deleting $g..."
  az group delete --name "$g" --yes --no-wait
done

echo ""
echo "✅ Deletion initiated for all resource groups."
echo "   Resources will be removed in the background (may take a few minutes)."
