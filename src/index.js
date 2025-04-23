const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');
const ReleaseCreator = require('./releaseCreator');

async function run() {
  try {
    const version = core.getInput('version', { required: true });
    const releaseNotes = core.getInput('release_notes', { required: true });
    const files = core.getInput('files').split(',');
    const shouldCommit = core.getBooleanInput('should_commit');
    const pluginPath = core.getInput('plugin_path');
    const surecartReleasePath = core.getInput('surecart_release_path');
    const token = core.getInput('github_token', { required: true });

    const octokit = github.getOctokit(token);

    const githubApi = {
      async createRelease({ version, releaseNotes, prerelease }) {
        const release = await octokit.rest.repos.createRelease({
          ...github.context.repo,
          tag_name: version,
          body: releaseNotes,
          prerelease,
        });
        return release.data;
      },
      async uploadReleaseAsset(releaseId, file) {
        const fs = require('fs');
        const path = require('path');

        const content = await fs.promises.readFile(file);
        const name = path.basename(file);

        await octokit.rest.repos.uploadReleaseAsset({
          ...github.context.repo,
          release_id: releaseId,
          name,
          data: content,
        });
      },
      async getReleaseUrl(releaseId) {
        const release = await octokit.rest.repos.getRelease({
          ...github.context.repo,
          release_id: releaseId,
        });
        return release.data.html_url;
      },
    };

    const gitApi = {
      async setupCommit() {
        await exec('git', ['config', 'user.name', 'github-actions']);
        await exec('git', ['config', 'user.email', 'github-actions@github.com']);
      },
      async addPluginFile() {
        await exec('git', ['add', pluginPath]);
      },
      async addSureCartReleaseFile() {
        await exec('git', ['add', surecartReleasePath]);
      },
      async commit() {
        let commitOutput = '';
        try {
          await exec('git', ['commit', '-m', `Bump version to ${version}`], {
            listeners: {
              stdout: (data) => {
                commitOutput += data.toString();
              },
              stderr: (data) => {
                commitOutput += data.toString();
              },
            },
          });

          core.debug(`Git commit output: ${commitOutput}`);

          // If we see "nothing to commit", return null immediately
          if (commitOutput.includes('nothing to commit')) {
            core.debug('Nothing to commit - no changes detected');
            return null;
          }

          // For a successful commit, we should see both:
          // 1. Our exact commit message
          // 2. A commit hash in the standard git output format
          const hasOurMessage = commitOutput.includes(`Bump version to ${version}`);
          const match = commitOutput.match(/\[[\w\-.]+ ([a-f0-9]+)]/);

          if (hasOurMessage && match) {
            const commitHash = match[1];
            core.debug(`Found our version bump commit: ${commitHash}`);
            return commitHash;
          }

          core.debug('Commit output did not match expected version bump pattern');
          return null;
        } catch (error) {
          core.debug(`Git commit error: ${error.message}`);
          if (commitOutput.includes('nothing to commit')) {
            return null;
          }
          throw error;
        }
      },
      async push() {
        await exec('git', ['push', 'origin', 'HEAD']);
      },
      async revert(commitHash) {
        if (!commitHash) {
          core.debug('No commit hash provided - skipping revert');
          return;
        }
        core.debug(`Attempting to revert commit: ${commitHash}`);
        try {
          await exec('git', ['revert', '--no-edit', commitHash]);
          await exec('git', ['push', 'origin', 'HEAD']);
        } catch (error) {
          core.debug(`Revert failed: ${error.message}`);
          throw error;
        }
      },
    };

    const releaseCreator = new ReleaseCreator({
      github: githubApi,
      git: gitApi,
      version,
      releaseNotes,
      files,
      shouldCommit,
      pluginPath,
      surecartReleasePath,
    });

    const result = await releaseCreator.createRelease();

    if (!result.success) {
      core.setFailed(result.error);
      return;
    }

    core.setOutput('release_url', result.url);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
