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
    let versionBumpCommit = null;
    try {
      // Verify files exist before proceeding
      if (this.files.length > 0) {
        const fs = require('fs');
        for (const file of this.files) {
          if (!file || !fs.existsSync(file)) {
            throw new Error(`Release asset not found: ${file}`);
          }
        }
      }

      if (this.shouldCommit) {
        if (!this.pluginPath) {
          throw new Error('plugin_path is required when should_commit is true');
        }
        versionBumpCommit = await this.git.commit();
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
      if (this.shouldCommit && versionBumpCommit) {
        await this.git.revert(versionBumpCommit);
      }
      let errorMessage = error.message;

      // Add specific error handling for existing release
      if (error.message?.includes('"code":"already_exists"')) {
        errorMessage = `A release with version ${this.version} already exists. If this version was **never** released to our customers, you can delete the existing GitHub release + tag, and try again.
Otherwise, you'll need to do a new release that increases the version number.`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

module.exports = ReleaseCreator;
