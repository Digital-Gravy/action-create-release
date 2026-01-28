/**
 * Tests for git user configuration functionality.
 *
 * Since the git configuration is done inside the run() function in index.js,
 * and testing the full action requires complex mocking of GitHub Actions runtime,
 * we test the configuration logic by verifying the gitApi construction behavior.
 */

describe('Git User Configuration', () => {
  let mockCore;
  let mockExec;
  let mockGitHub;

  beforeEach(() => {
    jest.resetModules();

    // Mock @actions/core
    mockCore = {
      getInput: jest.fn(),
      getBooleanInput: jest.fn(),
      setFailed: jest.fn(),
      setOutput: jest.fn(),
      debug: jest.fn(),
    };
    jest.doMock('@actions/core', () => mockCore);

    // Mock @actions/exec
    mockExec = {
      exec: jest.fn().mockResolvedValue(0),
    };
    jest.doMock('@actions/exec', () => mockExec);

    // Mock @actions/github
    mockGitHub = {
      getOctokit: jest.fn(() => ({
        rest: {
          repos: {
            createRelease: jest.fn().mockResolvedValue({ data: { id: 123 } }),
            uploadReleaseAsset: jest.fn().mockResolvedValue({}),
            getRelease: jest
              .fn()
              .mockResolvedValue({ data: { html_url: 'https://github.com/test/release' } }),
          },
        },
      })),
      context: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
      },
    };
    jest.doMock('@actions/github', () => mockGitHub);

    // Mock fs
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => true),
      promises: {
        readFile: jest.fn(() => Promise.resolve(Buffer.from('test content'))),
      },
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  const setupInputs = (overrides = {}) => {
    const defaults = {
      version: '1.0.0',
      release_notes: 'Test release notes',
      files: '',
      should_commit: true,
      plugin_path: 'src/plugin.php',
      surecart_release_path: '',
      github_token: 'test-token',
      git_user_name: '',
      git_user_email: '',
    };

    const inputs = { ...defaults, ...overrides };

    mockCore.getInput.mockImplementation((name) => inputs[name] || '');
    mockCore.getBooleanInput.mockImplementation((name) => inputs[name] || false);
  };

  test('uses default github-actions identity when git_user_name and git_user_email are not provided', async () => {
    setupInputs({
      should_commit: true,
    });

    // Import and run the action
    require('../src/index');

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify git config was called with default values
    const execCalls = mockExec.exec.mock.calls;
    const userNameCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.name'
    );
    const userEmailCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.email'
    );

    expect(userNameCall).toBeDefined();
    expect(userNameCall[1][2]).toBe('github-actions');

    expect(userEmailCall).toBeDefined();
    expect(userEmailCall[1][2]).toBe('github-actions@github.com');
  });

  test('uses custom git_user_name when provided', async () => {
    setupInputs({
      should_commit: true,
      git_user_name: 'my-custom-bot[bot]',
    });

    require('../src/index');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const execCalls = mockExec.exec.mock.calls;
    const userNameCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.name'
    );

    expect(userNameCall).toBeDefined();
    expect(userNameCall[1][2]).toBe('my-custom-bot[bot]');
  });

  test('uses custom git_user_email when provided', async () => {
    setupInputs({
      should_commit: true,
      git_user_email: '12345+my-bot[bot]@users.noreply.github.com',
    });

    require('../src/index');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const execCalls = mockExec.exec.mock.calls;
    const userEmailCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.email'
    );

    expect(userEmailCall).toBeDefined();
    expect(userEmailCall[1][2]).toBe('12345+my-bot[bot]@users.noreply.github.com');
  });

  test('uses both custom git_user_name and git_user_email when provided', async () => {
    setupInputs({
      should_commit: true,
      git_user_name: 'digitalgravy-deploy[bot]',
      git_user_email: '2744991+digitalgravy-deploy[bot]@users.noreply.github.com',
    });

    require('../src/index');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const execCalls = mockExec.exec.mock.calls;
    const userNameCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.name'
    );
    const userEmailCall = execCalls.find(
      (call) => call[0] === 'git' && call[1][0] === 'config' && call[1][1] === 'user.email'
    );

    expect(userNameCall).toBeDefined();
    expect(userNameCall[1][2]).toBe('digitalgravy-deploy[bot]');

    expect(userEmailCall).toBeDefined();
    expect(userEmailCall[1][2]).toBe('2744991+digitalgravy-deploy[bot]@users.noreply.github.com');
  });

  test('does not call git config when should_commit is false', async () => {
    setupInputs({
      should_commit: false,
    });

    require('../src/index');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const execCalls = mockExec.exec.mock.calls;
    const gitConfigCalls = execCalls.filter((call) => call[0] === 'git' && call[1][0] === 'config');

    expect(gitConfigCalls).toHaveLength(0);
  });
});
