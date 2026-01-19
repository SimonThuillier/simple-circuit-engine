# Release Script

**Objective** : Provide a quality of life / automation `bash` script to automate new releases shipment on this project.

**Use case**:
**Given** a feature/fix branch has been merged into `dev` branch, 
**When** the project's maintainer want to release a new version
**Then** he executes the script with the desired target version (ex: 0.1.2)

## Specification

The script:

1. check desired target version is provided, non empty and follow the semver x.y.z regex convention (with x.y.z. integers). If not it displays a clear error to the user and returns
2. checks availability of `git`, `grep`, `sed` and `npm` : If not present it displays a clear error to the user and returns
3. Runs `npm whoami` : if error code E401 (unauthorized) is returned display a clear error message telling to run npm login manually before running the script again.
4. checkouts the repository `git@github.com:SimonThuillier/simple-circuit-engine.git` in a new workdir /tmp/sce-release-{now as a YYYYMMDDHHmmss timestamp}: All following work MUST be done from this work directory. if it fails it displays a clear error to the user and returns
5. From the work directory checks the already present git tags : if desired target version is already taken it displays a clear error to the user and returns
6. resets hard the workdir state to origin/dev to get the remote `dev` branch state. if it fails it displays a clear error to the user and returns
7. Runs `git merge-base --is-ancestor main dev` to ensure main HEAD is an ancestor of dev HEAD (this prevents non-linear history). If not it displays a clear error to the user and returns
8. Runs `npm run install && npm run build && npm pack --dry-run` to ensure build/pack is possible before releasing. If not it displays a clear error to the user and returns

At this step the script has prepared the workdir and performed all startup checks. Real actions start now.

9. uses standard text utilities (grep / sed) to analyze the CHANGELOG.md and find the ## [Unreleased] part. If it fails or the part isn't found or empty it displays a clear error to the user and returns
10. edits the CHANGELOG.md to change the ## [Unreleased] into [{target version}] - {now at format YYYY-MM-dd}. If it fails it displays a clear error to the user and returns
11. edits the package.json and package-lock.json to change the "version" field into "{target version}". 
12. commits into the dev branch with a message "pre-release {target version}" and push to remote. If it fails it displays a clear error to the user and returns
13. squash and merge (normally secured by step 6) `dev` into `main`. Commit message is "release {target version}\n\ncontent of CHANGELOG [Unreleased] part. If it fails it displays a clear error to the user and returns
14. fetch origin, checkout `main` and pull. Then it creates a new tag {target version} with as message the same one used for the commit at step 13 and push it on remote. If it fails it displays a clear error to the user and returns
15. fetch origin, checkout `dev` and rebase dev onto `origin/main`. If it fails it displays a clear error to the user and returns
16. edit CHANGELOG.md to add a new virgin ## [Unreleased] Part on top of the just released new version part. For convenience it includes the standard subcategories (Added, Changed, Removed, Fixed in that order). If it fails it displays a clear error to the user and returns
17. commits into the rebased dev branch with a message "post-release {target version}" and run `git push --force-with-lease` to remote. If it fails it displays a clear error to the user and returns
18. Run `npm run build && npm publish` so that the new version is published on npm (public library).  If it fails it displays a clear error to the user and returns

Between each process step clear messages displaying the current progress are displayed. 

## Clarifications

1. Why using a tmp workdir ? NOT to mess with ongoing work into my development directory.
2. Is gh (Github CLI) required ? NO only basic git is available and should be used. I want the script simple : no github PR will be created only standard git commit/merge/rebase ops. It is assumed that SSH keys are well configured and user has admin rights on the repository.
3. Version convention : no v prefix version will be plain and simple at format x.y.z (ex 0.1.2)
4. CHANGELOG format. A standard semver changelog like : 
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
``md
## [Unreleased]

### Added

### Changed

### Removed

## [0.0.1] - 2026-01-09

### Added

- Public release of simple-circuit-engine
``

5. New Unreleased part created by the script in CHANGELOG should be : 
``
## [Unreleased]

### Added

### Changed

### Removed

### Fixed

``

6. Find the Unreleased part in the CHANGELOG.md
In this example : 
``md
## [Unreleased]

### Added

- Added quality of life automation script release.sh 

### Changed

### Removed

## [0.0.1] - 2026-01-09

### Added

- Public release of simple-circuit-engine
``
The unreleased part to select is the whole block : 
"## [Unreleased]

### Added

- Added quality of life automation script release.sh

### Changed

### Removed

"
DON'T perform cleaning: its belong to the developer to remove empty subsections they wouldn't want themselves. 
The only updates you should do are replacing ## [Unreleased] by for example ## [0.1.2] - 2026-01-19

7. Error messages : for errors requiring manual cleanup in the repository (catastrophes scenario error message should suggest brief hints of what to look, what to do)

8. upon script happy termination or fail this workdir SHOULD be Cleaned up automatically if already created.

9. If a fail occurs after step 8 (potentially with transient git modifications) the script SHOULDN'T attempt any kind of rollback/recovery itself : just display clearly what failed and let the user take care of the rest. 

## review post implementation

Review of release.sh

Overall, this is a well-structured and thorough release automation script with good error handling and safety practices. Here's my analysis:

Strengths

✓ Good safety practices: Uses set -e and set -u, cleanup trap, and worktree isolation to prevent accidental modifications to the main repo                                                                                        
✓ Comprehensive validation: Checks version format, npm auth, required commands, and changelog content before making changes                                                                                                       
✓ Clear progress indication: Uses colored output and step numbering for user feedback                                                                                                                                             
✓ Detailed error messages: Helpful guidance on fixing errors and manual cleanup if needed                                                                                                                                         
✓ Proper git workflow: Squash merge dev→main, rebase dev after release, tag management                                                                                                                                            
✓ Build verification: Runs tests/build/pack before release                                                                                                                                                                        
✓ Version consistency: Updates CHANGELOG, package.json, and package-lock.json together

Issues & Suggestions

1. Unsafe sed operations (lines 154-167, 235)                                                                                                                                                                                     
   The sed commands use first-match replacement without anchors, which could update unexpected occurrences if version strings appear elsewhere:
# Risky - could match in comments or strings
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$TARGET_VERSION\"/" package.json                                                                                                                                                 
Consider using jq for JSON files or more specific patterns.

2. CHANGELOG extraction is fragile (lines 139-142)                                                                                                                                                                                
   The sed command for extracting the Unreleased section is complex and may fail on edge cases:                                                                                                                                      
   UNRELEASED_CONTENT=$(sed -n '/^## \[Unreleased\]/,/^## \[/{ /^## \[/{ /^## \[Unreleased\]/!d; }; p; }' CHANGELOG.md | head -n -1)                                                                                                 
   Could fail if headers aren't formatted exactly as expected.

3. No linting/tests validation                                                                                                                                                                                                    
   The CLAUDE.md specifies npm test && npm run lint as part of commands, but the script skips this before release. Consider adding a test run in Step 8.

4. force-with-lease safety (line 244)                                                                                                                                                                                             
   Using --force-with-lease on dev is safe but should be documented as intentional (rebase scenario).

5. Missing npm version update                                                                                                                                                                                                     
   The script updates package.json but npm can also manage versioning via npm version. Consider using that instead of sed.

Recommendations

1. Replace sed for JSON with jq:                                                                                                                                                                                                  
   jq --arg v "$TARGET_VERSION" '.version = $v' package.json > tmp && mv tmp package.json
2. Add explicit test validation before release:                                                                                                                                                                                   
   echo "  Running npm test..."                                                                                                                                                                                                      
   if ! npm test; then                                                                                                                                                                                                               
   error_exit "npm test failed.\nFix test failures before releasing."                                                                                                                                                            
   fi
3. Simplify CHANGELOG extraction or validate its format more strictly
4. Add confirmation prompt before destructive operations (main push, npm publish)

The script is production-ready but these improvements would increase robustness.      