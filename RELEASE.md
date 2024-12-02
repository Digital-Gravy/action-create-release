# Release Process

This document outlines the steps to build and publish a new release of this GitHub Action.

## Prerequisites

- Node.js installed (v20 recommended)
- npm installed
- Git installed
- Repository cloned locally

## Using the Release Script

The easiest way to create a new release is to use the provided GitHub workflow that is triggered by pushing a new tag:

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

The workflow will:

1. Run all linting and testing checks
2. Build the action and push the dist directory to the main branch
3. Create/update major version tag (e.g., v1)
4. Create a GitHub release with auto-generated release notes

## Manual Release Process

If you need to perform a release manually, follow these steps:

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Tests**

   ```bash
   npm test
   ```

3. **Run Linting**

   ```bash
   npm run lint
   ```

4. **Build the Action**

   ```bash
   npm run build
   ```

5. **Commit Changes**

   ```bash
   git add dist/
   git commit -m "Build for release"
   git push
   ```

6. **Tag and Release**

   For a new version:

   ```bash
   # Create version tag
   git tag -a v1.0.0 -m "Release version 1.0.0"

   # Create or update major version tag
   git tag -fa v1 -m "Update v1 tag"

   # Push both tags
   git push origin v1.0.0
   git push origin v1 --force
   ```

7. **Create GitHub Release**
   - Go to GitHub repository
   - Click "Releases"
   - Click "Create a new release"
   - Choose your tag
   - Add release notes
   - Publish release

## Version Tag Format

- Specific versions: `v1.0.0`, `v1.0.1`, etc.
- Major version tag: `v1`

## Notes

- The `dist` folder must be committed as it contains the compiled action code
- Major version tags (`v1`) should be force-pushed to point to the latest release in that major version
- Users referencing `@v1` will automatically get the latest release in the v1.x.x series
- Remember to update the README if there are any usage changes
