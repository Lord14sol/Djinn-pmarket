#!/bin/bash
# 🧹 PROTOCOL: FINAL PURGE
# Goal: Remove all Cerberus/Sentinel traces from Public Repo

CITADEL_VAULT="../Djinn-citadel/cerberus/sentinel_archive"

echo "🛡️ Initiating Final Security Sweep..."

# 1. Archive Sentinel (Just in case)
if [ -d "sentinel" ]; then
    echo "📦 Archiving Sentinel to Vault..."
    mkdir -p "$CITADEL_VAULT"
    mv sentinel/* "$CITADEL_VAULT/" 2>/dev/null || cp -r sentinel "$CITADEL_VAULT/"
    rm -rf sentinel
    echo "✅ Sentinel Moved & Deleted."
else
    echo "⚠️  Sentinel folder not found (Clean)."
fi

# 2. Delete Redundant Oracle Folder (Already migrated to Cerberus)
if [ -d "djinn-oracle" ]; then
    echo "🔥 Burning leftover djinn-oracle..."
    rm -rf djinn-oracle
    echo "✅ djinn-oracle Deleted."
fi

# 3. Remove Shell Scripts (Evidence)
echo "📄 Shredding setup scripts..."
rm -f setup_citadel.sh setup_citadel_ui.sh setup_citadel_git.sh push_citadel.sh sync_citadel.sh relink_citadel.sh run_citadel_gauntlet.sh start_citadel.sh

echo "✨ DJINN-PMARKET IS CLEAN."
