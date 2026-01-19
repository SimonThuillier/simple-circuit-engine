#!/bin/bash

# Release automation script for simple-circuit-engine
# After merging into dev run this script to update changelog, merge into main, tag the new version, rebase dev and publish to npm
# Usage: ./release.sh <version>
# Example: ./release.sh 0.1.2

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Global variables
WORKDIR=""
TARGET_VERSION=""
REPO_URL="git@github.com:SimonThuillier/simple-circuit-engine.git"

# Cleanup function to remove workdir
cleanup() {
    if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
        echo -e "${YELLOW}Cleaning up temporary workdir: $WORKDIR${NC}"
        cd /tmp
        # Properly remove worktree registration, fallback to rm if git command fails
        git worktree remove --force "$WORKDIR" 2>/dev/null || rm -rf "$WORKDIR"
        echo -e "${GREEN}Cleanup complete${NC}"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Error handler
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Progress indicator
progress() {
    echo -e "${GREEN}[STEP $1] $2${NC}"
}

# Step 1: Validate version argument
progress 1 "Validating version argument"
if [ $# -ne 1 ]; then
    error_exit "Usage: $0 <version>\nExample: $0 0.1.2"
fi

TARGET_VERSION="$1"

if [[ ! "$TARGET_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error_exit "Version must follow semver format x.y.z where x, y, z are integers\nProvided: $TARGET_VERSION"
fi

echo "Target version: $TARGET_VERSION"

# Step 2: Check required commands
progress 2 "Checking required commands"
for cmd in git grep sed npm; do
    if ! command -v "$cmd" &> /dev/null; then
        error_exit "Required command '$cmd' not found. Please install it and try again."
    fi
    echo "  ✓ $cmd found"
done

# Step 3: Check npm authentication
progress 3 "Checking npm authentication"
if ! npm whoami &> /dev/null; then
    error_exit "Not authenticated with npm (error code E401).\nPlease run 'npm login' before running this script again."
fi
echo "  ✓ Authenticated as $(npm whoami)"

# Step 4: Create temporary workdir with git worktree
progress 4 "Creating temporary workdir"

# Clean up any stale release worktrees from previous runs
for stale_dir in /tmp/sce-release-*; do
    if [ -d "$stale_dir" ]; then
        echo "  Cleaning up stale worktree: $stale_dir"
        git worktree remove --force "$stale_dir" 2>/dev/null || rm -rf "$stale_dir"
    fi
done
git worktree prune 2>/dev/null

TIMESTAMP=$(date +%Y%m%d%H%M%S)
WORKDIR="/tmp/sce-release-$TIMESTAMP"

if ! git worktree add "$WORKDIR" --detach &> /dev/null; then
    error_exit "Failed to create git worktree at $WORKDIR.\nCheck git repository status and permissions."
fi

echo "  ✓ Created workdir: $WORKDIR"
cd "$WORKDIR" || error_exit "Failed to change directory to $WORKDIR"

# Step 5: Check if version tag already exists
progress 5 "Checking if version tag already exists"
if git tag | grep -q "^$TARGET_VERSION$"; then
    error_exit "Version tag '$TARGET_VERSION' already exists.\nPlease choose a different version or delete the existing tag."
fi
echo "  ✓ Version tag '$TARGET_VERSION' is available"

# Step 6: Checkout temporary release branch from origin/dev
progress 6 "Checking out release branch from origin/dev"
git fetch origin || error_exit "Failed to fetch from origin"
# Use a temporary branch name to avoid conflicts with 'dev' checked out in main worktree
if ! git checkout -B sce-release origin/dev; then
    error_exit "Failed to checkout temporary sce-release from origin/dev.\nCheck if dev branch exists on remote."
fi
echo "  ✓ Checked out temporary sce-release branch from origin/dev"

# Step 7: Verify main is ancestor of dev
progress 7 "Verifying main is ancestor of dev (no non-linear history)"
if ! git merge-base --is-ancestor origin/main origin/dev; then
    error_exit "main HEAD is not an ancestor of dev HEAD.\nThis indicates non-linear history. Please resolve this before releasing."
fi
echo "  ✓ main is ancestor of dev"

# Step 8: Test build and pack
progress 8 "Testing build and pack"
echo "  Running npm install..."
if ! npm install; then
    error_exit "npm install failed.\nFix the installation issues before releasing."
fi

echo "  Running npm run build..."
if ! npm run build; then
    error_exit "npm run build failed.\nFix the build errors before releasing."
fi

echo "  Running npm pack --dry-run..."
if ! npm pack --dry-run; then
    error_exit "npm pack --dry-run failed.\nFix the packaging issues before releasing."
fi
echo "  ✓ Build and pack successful"

# Step 9: Find and validate Unreleased section in CHANGELOG.md
progress 9 "Validating CHANGELOG.md [Unreleased] section"
if [ ! -f "CHANGELOG.md" ]; then
    error_exit "CHANGELOG.md not found in repository"
fi

if ! grep -q "^## \[Unreleased\]" CHANGELOG.md; then
    error_exit "CHANGELOG.md does not contain '## [Unreleased]' section.\nPlease add an Unreleased section with your changes."
fi

# Extract the Unreleased section content (from ## [Unreleased] to the next ## or end of file)
UNRELEASED_CONTENT=$(sed -n '/^## \[Unreleased\]/,/^## \[/{ /^## \[/{ /^## \[Unreleased\]/!d; }; p; }' CHANGELOG.md | head -n -1)
if [ -z "$UNRELEASED_CONTENT" ]; then
    UNRELEASED_CONTENT=$(sed -n '/^## \[Unreleased\]/,$p' CHANGELOG.md)
fi

# Check if there's content beyond the header
if [ "$(echo "$UNRELEASED_CONTENT" | wc -l)" -le 2 ]; then
    error_exit "CHANGELOG.md [Unreleased] section appears to be empty.\nPlease add your changes before releasing."
fi

echo "  ✓ Found valid [Unreleased] section"

# Step 10: Update CHANGELOG.md with version and date
progress 10 "Updating CHANGELOG.md with version and date"
RELEASE_DATE=$(date +%Y-%m-%d)
sed -i "s/^## \[Unreleased\]/## [$TARGET_VERSION] - $RELEASE_DATE/" CHANGELOG.md

# Verify the replacement was made
if ! grep -q "^## \[$TARGET_VERSION\] - $RELEASE_DATE" CHANGELOG.md; then
    error_exit "Failed to update CHANGELOG.md: version header not found after sed"
fi
echo "  ✓ Updated CHANGELOG.md: ## [$TARGET_VERSION] - $RELEASE_DATE"

# Step 11: Update package.json and package-lock.json version
progress 11 "Updating package.json and package-lock.json version"
if ! npm version "$TARGET_VERSION" --no-git-tag-version --allow-same-version; then
    error_exit "Failed to update version to $TARGET_VERSION"
fi

# Verify version was correctly updated
ACTUAL_VERSION=$(node -p "require('./package.json').version")
if [ "$ACTUAL_VERSION" != "$TARGET_VERSION" ]; then
    error_exit "Version mismatch after npm version: expected $TARGET_VERSION, got $ACTUAL_VERSION"
fi
echo "  ✓ Updated version to $TARGET_VERSION"

# Step 12: Commit to dev and push
progress 12 "Committing pre-release changes to dev"
git add CHANGELOG.md package.json package-lock.json
git commit -m "pre-release $TARGET_VERSION" || error_exit "Failed to commit pre-release changes"
if ! git push origin sce-release:dev; then
    error_exit "Failed to push to origin/dev.\nManual cleanup required: check dev branch in workdir $WORKDIR"
fi
echo "  ✓ Committed and pushed pre-release changes to dev"

# Step 13: Squash merge dev into main
progress 13 "Squash merging dev into main"
git checkout -B main origin/main || error_exit "Failed to checkout main branch"
git fetch origin dev || error_exit "Failed to fetch origin/dev"

# Extract changelog content for commit message (remove the header line)
CHANGELOG_CONTENT=$(echo "$UNRELEASED_CONTENT" | tail -n +2)
COMMIT_MESSAGE="release $TARGET_VERSION

$CHANGELOG_CONTENT"

# Merge origin/dev (not local dev) to include the pre-release commits pushed in step 12
if ! git merge --squash origin/dev; then
    error_exit "Failed to squash merge origin/dev into main.\nManual cleanup required: resolve merge conflicts in workdir $WORKDIR"
fi

git commit -F - <<EOF || error_exit "Failed to commit release to main"
$COMMIT_MESSAGE
EOF
if ! git push origin main; then
    error_exit "Failed to push to origin/main.\nManual cleanup required: check main branch in workdir $WORKDIR"
fi
echo "  ✓ Squash merged dev into main and pushed"

# Step 14: Create and push tag
progress 14 "Creating and pushing version tag"
if ! git tag -a "$TARGET_VERSION" -F - <<EOF
$COMMIT_MESSAGE
EOF
then
    error_exit "Failed to create tag $TARGET_VERSION"
fi
if ! git push origin "$TARGET_VERSION"; then
    error_exit "Failed to push tag to origin.\nManual cleanup required: check tags in repository"
fi
echo "  ✓ Created and pushed tag $TARGET_VERSION"

# Step 15: Rebase dev onto main
progress 15 "Rebasing dev onto main"
git fetch origin || error_exit "Failed to fetch from origin"
git checkout -B sce-release origin/dev || error_exit "Failed to checkout sce-release from origin/dev"
if ! git rebase origin/main; then
    error_exit "Failed to rebase sce-release onto origin/main.\nManual cleanup required: resolve rebase conflicts in workdir $WORKDIR"
fi
echo "  ✓ Rebased dev onto main"

# Step 16: Add new [Unreleased] section to CHANGELOG.md
progress 16 "Adding new [Unreleased] section to CHANGELOG.md"

# Find the line number of the version header
VERSION_LINE=$(grep -n "^## \[$TARGET_VERSION\]" CHANGELOG.md | cut -d: -f1)
if [ -z "$VERSION_LINE" ]; then
    error_exit "Could not find version header ## [$TARGET_VERSION] in CHANGELOG.md"
fi

# Create new changelog with unreleased section inserted before version line
{
    head -n $((VERSION_LINE - 1)) CHANGELOG.md
    cat << 'EOF'
## [Unreleased]

### Added

### Changed

### Removed

### Fixed

EOF
    tail -n +$VERSION_LINE CHANGELOG.md
} > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

# Verify the new section was added
if ! grep -q "^## \[Unreleased\]" CHANGELOG.md; then
    error_exit "Failed to add [Unreleased] section to CHANGELOG.md"
fi
echo "  ✓ Added new [Unreleased] section"

# Step 17: Commit and force-with-lease push dev
progress 17 "Committing post-release changes to dev"
git add CHANGELOG.md
git commit -m "post-release $TARGET_VERSION" || error_exit "Failed to commit post-release changes"
if ! git push --force-with-lease origin sce-release:dev; then
    error_exit "Failed to force-with-lease push to origin/dev.\nManual cleanup required: check dev branch in workdir $WORKDIR"
fi
echo "  ✓ Committed and pushed post-release changes to dev"

# Step 18: Build and publish to npm
progress 18 "Publishing to npm"
git checkout main || error_exit "Failed to checkout main for publishing"
git pull origin main || error_exit "Failed to pull main for publishing"

echo "  Running npm run build..."
if ! npm run build; then
    error_exit "npm run build failed before publishing.\nManual investigation required: check build in workdir $WORKDIR"
fi

echo "  Running npm publish..."
if ! npm publish; then
    error_exit "npm publish failed.\nManual investigation required: check if version was already published"
fi
echo "  ✓ Published version $TARGET_VERSION to npm"

# Success!
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release $TARGET_VERSION completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  • Version $TARGET_VERSION released"
echo "  • CHANGELOG.md updated"
echo "  • Tag $TARGET_VERSION created and pushed"
echo "  • Published to npm"
echo "  • dev branch rebased onto main"
echo ""
