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
      async commit() {
        await exec('git', ['config', 'user.name', 'github-actions']);
        await exec('git', ['config', 'user.email', 'github-actions@github.com']);
        await exec('git', ['add', pluginPath]);

        let commitHash = '';
        await exec('git', ['commit', '-m', `Bump version to ${version}`], {
          listeners: {
            stdout: (data) => {
              commitHash += data.toString().trim();
            },
          },
        });

        // Extract commit hash from the git commit output
        // The output is typically in the format: [branch hash] Commit message
        const match = commitHash.match(/[[\w\-.]+ ([a-f0-9]+)]/);
        return match ? match[1] : null;
      },
      async push() {
        await exec('git', ['push', 'origin', 'HEAD']);
      },
      async revert(commitHash) {
        if (!commitHash) {
          throw new Error('No commit hash provided for revert');
        }
        await exec('git', ['revert', '--no-edit', commitHash]);
        await exec('git', ['push', 'origin', 'HEAD']);
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
