const semver = require('semver');

class ReleaseCreator {
  constructor({ github, git, version, releaseNotes, files, shouldCommit, pluginPath }) {
    this.github = github;
    this.git = git;
    this.version = version;
    this.releaseNotes = releaseNotes;
    this.files = files.filter(Boolean);
    this.shouldCommit = shouldCommit;
    this.pluginPath = pluginPath;
  }

  isPrerelease() {
    const parsed = semver.parse(this.version);
    if (!parsed) return false;

    // Check for prerelease (-alpha, -beta, -rc, etc.)
    if (parsed.prerelease.length > 0) return true;

    // Check for build metadata (+20240101, etc.)
    if (parsed.build.length > 0) return true;

    return false;
  }

  async createRelease() {
    try {
      if (this.shouldCommit) {
        if (!this.pluginPath) {
          throw new Error('plugin_path is required when should_commit is true');
        }
        await this.git.commit();
        await this.git.push();
      }

      const release = await this.github.createRelease({
        version: this.version,
        releaseNotes: this.releaseNotes,
        prerelease: this.isPrerelease(),
      });

      for (const file of this.files) {
        await this.github.uploadReleaseAsset(release.id, file);
      }

      const url = await this.github.getReleaseUrl(release.id);

      return {
        success: true,
        url,
      };
    } catch (error) {
      if (this.shouldCommit) {
        await this.git.revert();
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ReleaseCreator;
