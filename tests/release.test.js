const ReleaseCreator = require('../src/releaseCreator');
jest.mock('fs');

describe('ReleaseCreator', () => {
  let releaseCreator;
  let mockGitHub;
  let mockGit;

  beforeEach(() => {
    jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);

    // Mock GitHub API
    mockGitHub = {
      createRelease: jest.fn(),
      uploadReleaseAsset: jest.fn(),
      getReleaseUrl: jest.fn(),
    };

    // Mock Git operations
    mockGit = {
      commit: jest.fn(),
      push: jest.fn(),
      revert: jest.fn(),
    };

    releaseCreator = new ReleaseCreator({
      github: mockGitHub,
      git: mockGit,
      version: '1.0.0',
      releaseNotes: 'Test release notes',
      files: ['dist/plugin.zip'],
      shouldCommit: false,
    });
  });

  describe('createRelease', () => {
    test('should create a release successfully', async () => {
      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(mockGitHub.createRelease).toHaveBeenCalledWith({
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        prerelease: false,
      });
      expect(result).toEqual({
        success: true,
        url: 'https://github.com/org/repo/releases/1.0.0',
      });
    });

    test('should handle commit and release together', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      mockGit.commit.mockResolvedValue(true);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(mockGitHub.createRelease).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should rollback commit if release fails', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      mockGit.commit.mockResolvedValue(true);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockRejectedValue(new Error('Release failed'));

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(mockGit.revert).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    test('should upload release assets', async () => {
      const releaseData = { id: '123' };
      mockGitHub.createRelease.mockResolvedValue(releaseData);
      mockGitHub.uploadReleaseAsset.mockResolvedValue({});
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(mockGitHub.createRelease).toHaveBeenCalledWith({
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        prerelease: false,
      });
      expect(mockGitHub.uploadReleaseAsset).toHaveBeenCalledWith(releaseData.id, 'dist/plugin.zip');
      expect(result.success).toBe(true);
    });

    test('should handle file upload failures', async () => {
      const releaseData = { id: '123' };
      mockGitHub.createRelease.mockResolvedValue(releaseData);
      mockGitHub.uploadReleaseAsset.mockRejectedValue(new Error('Upload failed'));

      const result = await releaseCreator.createRelease();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    test('should create a prerelease for alpha/beta/rc versions', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0-beta.1',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: false,
      });

      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue(
        'https://github.com/org/repo/releases/1.0.0-beta.1'
      );

      const result = await releaseCreator.createRelease();

      expect(mockGitHub.createRelease).toHaveBeenCalledWith({
        version: '1.0.0-beta.1',
        releaseNotes: 'Test release notes',
        prerelease: true,
      });
      expect(result.success).toBe(true);
    });

    test('should create a prerelease for build metadata versions', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0+20240101',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: false,
      });

      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue(
        'https://github.com/org/repo/releases/1.0.0+20240101'
      );

      const result = await releaseCreator.createRelease();

      expect(mockGitHub.createRelease).toHaveBeenCalledWith({
        version: '1.0.0+20240101',
        releaseNotes: 'Test release notes',
        prerelease: true,
      });
      expect(result.success).toBe(true);
    });

    describe('isPrerelease', () => {
      test.each([
        ['1.0.0', false],
        ['1.0.0-alpha.1', true],
        ['1.0.0-beta.1', true],
        ['1.0.0-rc.1', true],
        ['1.0.0+20240101', true],
        ['1.0.0-alpha-1', true], // Matches workflow's dash pattern
        ['1.0.0-beta-2', true], // Matches workflow's dash pattern
        ['1.0.0-rc-3', true], // Matches workflow's dash pattern
        ['1.0.0+build.123', true],
        ['invalid-version', false],
      ])('should correctly identify prerelease status for %s', (version, expected) => {
        const releaseCreator = new ReleaseCreator({
          github: mockGitHub,
          git: mockGit,
          version: version,
          releaseNotes: 'Test release notes',
          files: [],
          shouldCommit: false,
        });

        expect(releaseCreator.isPrerelease()).toBe(expected);
      });
    });

    test('should require plugin_path when shouldCommit is true', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        // pluginPath intentionally omitted
      });

      const result = await releaseCreator.createRelease();

      expect(result.success).toBe(false);
      expect(result.error).toBe('plugin_path is required when should_commit is true');
      expect(mockGit.commit).not.toHaveBeenCalled();
    });

    test('should commit with plugin path when provided', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      mockGit.commit.mockResolvedValue(true);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should not require plugin_path when shouldCommit is false', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: false,
        // pluginPath intentionally omitted
      });

      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(result.success).toBe(true);
      expect(mockGit.commit).not.toHaveBeenCalled();
    });

    test('should fail if release asset file does not exist', async () => {
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);

      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['non-existent-file.zip'],
        shouldCommit: false,
      });

      const result = await releaseCreator.createRelease();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Release asset not found: non-existent-file.zip');
      expect(mockGitHub.createRelease).not.toHaveBeenCalled();
    });

    test('should only rollback own version bump commit if release fails', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      const versionBumpCommitHash = 'abc123';
      mockGit.commit.mockResolvedValue(versionBumpCommitHash);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockRejectedValue(new Error('Release failed'));

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(mockGit.revert).toHaveBeenCalledWith(versionBumpCommitHash);
      expect(result.success).toBe(false);
    });

    test('should not attempt to revert bump commit if no version bump is needed', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      // Mock git commit returning null (no changes to commit)
      mockGit.commit.mockResolvedValue(null);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockResolvedValue({ id: '123' });
      mockGitHub.getReleaseUrl.mockResolvedValue('https://github.com/org/repo/releases/1.0.0');

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(mockGit.revert).not.toHaveBeenCalled(); // Should not attempt to revert
      expect(result.success).toBe(true);
    });

    test('should only revert if commit was actually created', async () => {
      releaseCreator = new ReleaseCreator({
        github: mockGitHub,
        git: mockGit,
        version: '1.0.0',
        releaseNotes: 'Test release notes',
        files: ['dist/plugin.zip'],
        shouldCommit: true,
        pluginPath: 'path/to/plugin.php',
      });

      // Mock git commit returning null (no changes to commit)
      mockGit.commit.mockResolvedValue(null);
      mockGit.push.mockResolvedValue(true);
      mockGitHub.createRelease.mockRejectedValue(new Error('Release failed'));

      const result = await releaseCreator.createRelease();

      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
      expect(mockGit.revert).not.toHaveBeenCalled(); // Should not attempt to revert
      expect(result.success).toBe(false);
    });
  });
});
