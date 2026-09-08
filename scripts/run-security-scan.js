/**
 * Local Security Scan Runner
 * Cross-platform runner for local security audits (Trivy, OSV, Gitleaks, Zizmor, DAST, CodeQL).
 * Automatically detects native CLI binaries, Docker containers, or falls back to built-in tools.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

/**
 * Checks if a command/executable exists in PATH.
 * @param {string} cmd
 * @returns {boolean}
 */
function checkCommandExists(cmd) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the Docker daemon is reachable.
 * @returns {boolean}
 */
function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves execution plan for a specified security tool.
 * @param {string} tool - 'trivy' | 'osv' | 'gitleaks' | 'zizmor' | 'dast' | 'codeql'
 * @param {object} [envChecks] - Optional dependency injection for testing
 * @returns {{ type: 'cli' | 'docker' | 'fallback' | 'missing', cmd?: string, instructions?: string, message?: string }}
 */
function resolveRunner(tool, envChecks = {}) {
  const hasCmd = envChecks.hasCmd ?? checkCommandExists;
  const hasDocker = envChecks.hasDocker ?? isDockerAvailable;
  const cwd = envChecks.cwd ?? process.cwd();
  const normalizedCwd = cwd.replace(/\\/g, '/');

  switch (tool) {
    case 'trivy':
      if (hasCmd('trivy')) {
        return { type: 'cli', cmd: 'trivy fs . --severity CRITICAL,HIGH --ignore-unfixed' };
      }
      if (hasDocker()) {
        return {
          type: 'docker',
          cmd: `docker run --rm -v "${normalizedCwd}:/src" aquasec/trivy fs /src --severity CRITICAL,HIGH --ignore-unfixed`,
        };
      }
      return {
        type: 'missing',
        instructions: [
          'Trivy is not found in PATH and Docker daemon is not active.',
          'Install Trivy locally:',
          '  • Windows (winget): winget install AquaSecurity.Trivy',
          '  • macOS (Homebrew): brew install trivy',
          '  • Or start Docker Desktop to run via container.',
        ].join('\n'),
      };

    case 'osv':
      if (hasCmd('osv-scanner')) {
        return { type: 'cli', cmd: 'osv-scanner --lockfile=package-lock.json' };
      }
      if (hasDocker()) {
        return {
          type: 'docker',
          cmd: `docker run --rm -v "${normalizedCwd}:/src" ghcr.io/google/osv-scanner:latest --lockfile=/src/package-lock.json`,
        };
      }
      return {
        type: 'missing',
        instructions: [
          'Google OSV-Scanner is not found in PATH and Docker daemon is not active.',
          'Install OSV-Scanner locally:',
          '  • Go: go install github.com/google/osv-scanner/v2/cmd/osv-scanner@latest',
          '  • Or download binary from: https://github.com/google/osv-scanner/releases',
          '  • Or start Docker Desktop to run via container.',
        ].join('\n'),
      };

    case 'gitleaks':
      if (hasCmd('gitleaks')) {
        return { type: 'cli', cmd: 'gitleaks detect --source . --config .gitleaks.toml --verbose' };
      }
      if (hasDocker()) {
        return {
          type: 'docker',
          cmd: `docker run --rm -v "${normalizedCwd}:/path" zricethezav/gitleaks:latest detect --source=/path --config=/path/.gitleaks.toml --verbose`,
        };
      }
      return {
        type: 'fallback',
        cmd: 'node scripts/check-secrets.js',
        message:
          'Gitleaks CLI not found in PATH. Falling back to built-in local secret scanner (scripts/check-secrets.js)...',
      };

    case 'zizmor':
      if (hasCmd('zizmor')) {
        return { type: 'cli', cmd: 'zizmor .' };
      }
      if (hasCmd('uvx')) {
        return { type: 'cli', cmd: 'uvx zizmor .' };
      }
      if (hasCmd('pipx')) {
        return { type: 'cli', cmd: 'pipx run zizmor .' };
      }
      return {
        type: 'missing',
        instructions: [
          'zizmor is not installed.',
          'Install zizmor locally:',
          '  • uv: uvx zizmor .',
          '  • Cargo: cargo install zizmor',
          '  • pipx: pipx install zizmor',
          '  • Or download binary from: https://github.com/zizmorcore/zizmor/releases',
        ].join('\n'),
      };

    case 'dast':
      if (hasDocker()) {
        return {
          type: 'docker',
          cmd: 'docker run --rm -t zaproxy/zap-stable zap-baseline.py -t https://home-management.dev',
        };
      }
      return {
        type: 'missing',
        instructions: [
          'Docker daemon is required to run OWASP ZAP locally.',
          'Start Docker Desktop, then re-run this command.',
        ].join('\n'),
      };

    case 'codeql':
      if (hasCmd('codeql')) {
        return {
          type: 'cli',
          cmd: 'codeql database create codeql-db --language=javascript-typescript && codeql database analyze codeql-db',
        };
      }
      return {
        type: 'missing',
        instructions: [
          'CodeQL CLI is not installed.',
          'To run CodeQL locally:',
          '  • Install the official "CodeQL" extension in VS Code / Cursor for interactive local queries.',
          '  • Or install CodeQL CLI: https://docs.github.com/en/code-security/codeql-cli',
        ].join('\n'),
      };

    default:
      return {
        type: 'missing',
        instructions: `Unknown security tool: "${tool}". Supported: trivy, osv, gitleaks, zizmor, dast, codeql, all`,
      };
  }
}

/**
 * Executes a resolved runner plan.
 * @param {string} tool
 * @param {object} [plan]
 * @returns {number} Exit code
 */
function executePlan(tool, plan = resolveRunner(tool)) {
  console.log(`\n========================================`);
  console.log(`Running Security Scan: ${tool.toUpperCase()}`);
  console.log(`========================================\n`);

  if (plan.type === 'missing') {
    console.warn(`[!] ${plan.instructions}\n`);
    return 1;
  }

  if (plan.type === 'fallback' && plan.message) {
    console.log(`[*] ${plan.message}\n`);
  }

  const fullCmd = plan.cmd;
  console.log(`Executing: ${fullCmd}\n`);

  const result = spawnSync(fullCmd, {
    stdio: 'inherit',
    shell: true,
  });

  return result.status ?? (result.error ? 1 : 0);
}

/**
 * Runs all configured local security scans.
 */
function runAll() {
  console.log('Starting full local security scan suite...\n');

  const steps = [
    { name: 'Secrets Check', cmd: 'node scripts/check-secrets.js' },
    { name: 'NPM Audit', cmd: 'npm audit --audit-level=critical' },
    { name: 'Socket Supply Chain', cmd: 'npx -y @socketsecurity/cli scan' },
    {
      name: 'CycloneDX SBOM',
      cmd: 'npx -y @cyclonedx/cyclonedx-npm --ignore-npm-errors --output-file cyclonedx.sbom.json',
    },
    { name: 'Trivy Scan', tool: 'trivy' },
    { name: 'OSV Scanner', tool: 'osv' },
    { name: 'Zizmor Workflows', tool: 'zizmor' },
  ];

  let totalFailures = 0;

  for (const step of steps) {
    console.log(`\n----------------------------------------`);
    console.log(`>> [SUITE] ${step.name}`);
    console.log(`----------------------------------------`);

    if (step.tool) {
      const plan = resolveRunner(step.tool);
      if (plan.type === 'missing') {
        console.log(`[i] Skipped (tool not installed locally).`);
        continue;
      }
      const code = executePlan(step.tool, plan);
      if (code !== 0) totalFailures++;
    } else {
      console.log(`Executing: ${step.cmd}\n`);
      const result = spawnSync(step.cmd, { stdio: 'inherit', shell: true });
      if ((result.status ?? 0) !== 0) {
        totalFailures++;
      }
    }
  }

  console.log(`\n========================================`);
  if (totalFailures === 0) {
    console.log('All local security scans passed successfully!');
    console.log(`========================================\n`);
    return 0;
  } else {
    console.error(`Security scan suite completed with ${totalFailures} failure(s).`);
    console.log(`========================================\n`);
    return 1;
  }
}

// Direct CLI invocation
if (require.main === module) {
  const target = process.argv[2] || 'all';

  if (target === 'all') {
    const code = runAll();
    process.exit(code);
  } else {
    const code = executePlan(target);
    process.exit(code);
  }
}

module.exports = {
  checkCommandExists,
  isDockerAvailable,
  resolveRunner,
  executePlan,
  runAll,
};
