# Create Release Action

[![Tests](https://github.com/Digital-Gravy/action-create-release/actions/workflows/test.yml/badge.svg)](https://github.com/Digital-Gravy/action-create-release/actions/workflows/test.yml)

A GitHub Action that creates a release with optional version bump commit. This action supports attaching multiple assets to the release and can automatically commit version changes to your repository.

## Features

- Creates GitHub releases with customizable release notes
- Supports attaching multiple files as release assets
- Optional version bump commit functionality
- Automatic prerelease detection for alpha/beta/rc versions
- Supports build metadata versions
- Handles rollback if release creation fails

## Usage

Add the following step to your workflow:

```yaml
- name: Create Release
  uses: Digital-Gravy/action-create-release@v1
  with:
    version: '1.0.0'
    release_notes: 'Release notes content'
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input           | Description                                                  | Required | Default |
| --------------- | ------------------------------------------------------------ | -------- | ------- |
| `version`       | Version to create release for (e.g., '1.0.0')                | Yes      | -       |
| `release_notes` | Release notes content                                        | Yes      | -       |
| `files`         | Comma-separated list of files to attach to the release       | No       | -       |
| `should_commit` | Whether to commit version bump changes                       | No       | false   |
| `plugin_path`   | Path to the plugin file to commit when should_commit is true | No       | -       |
| `github_token`  | GitHub token for authentication                              | Yes      | -       |

### Outputs

| Output        | Description                |
| ------------- | -------------------------- |
| `release_url` | URL of the created release |

### Example Workflow

Here's a complete example of how to use this action:

```yaml
name: Create Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true
      release_notes:
        description: 'Release notes'
        required: true

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Release
        uses: Digital-Gravy/action-create-release@v1
        with:
          version: ${{ github.event.inputs.version }}
          release_notes: ${{ github.event.inputs.release_notes }}
          files: 'dist/asset1.zip,dist/asset2.zip'
          should_commit: true
          plugin_path: 'path/to/plugin.php'
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Version Handling

### Prerelease Detection

The action automatically detects prerelease versions based on:

- Alpha/beta/rc suffixes (e.g., `1.0.0-alpha.1`, `1.0.0-beta.1`, `1.0.0-rc.1`)
- Build metadata (e.g., `1.0.0+20240101`)
- Dash-separated versions (e.g., `1.0.0-alpha-1`, `1.0.0-beta-2`)

Prerelease versions are marked as prereleases in GitHub.

### Version Bump Commits

When `should_commit` is set to `true`:

- The action commits version changes to the specified plugin file
- Commits are made with the message "Bump version to {version}"
- If the release creation fails, the commit is automatically reverted
- `plugin_path` is required when `should_commit` is enabled

## Error Handling

The action includes robust error handling:

- Validates required inputs
- Automatically reverts version bump commits if release creation fails
- Returns detailed error messages in case of failures

## License

GPLv3 - see LICENSE file for details
