import { describe, it, expect } from 'vitest';
import { resolveRunner } from './run-security-scan';

describe('run-security-scan', () => {
  describe('resolveRunner - Trivy', () => {
    it('should choose CLI when trivy is installed', () => {
      const plan = resolveRunner('trivy', {
        hasCmd: (cmd) => cmd === 'trivy',
        hasDocker: () => false,
      });
      expect(plan.type).toBe('cli');
      expect(plan.cmd).toContain('trivy fs .');
    });

    it('should choose Docker when trivy is missing but Docker is available', () => {
      const plan = resolveRunner('trivy', {
        hasCmd: () => false,
        hasDocker: () => true,
        cwd: '/mock/repo',
      });
      expect(plan.type).toBe('docker');
      expect(plan.cmd).toContain('aquasec/trivy fs /src');
    });

    it('should report missing when neither CLI nor Docker is available', () => {
      const plan = resolveRunner('trivy', {
        hasCmd: () => false,
        hasDocker: () => false,
      });
      expect(plan.type).toBe('missing');
      expect(plan.instructions).toContain('winget install AquaSecurity.Trivy');
    });
  });

  describe('resolveRunner - OSV Scanner', () => {
    it('should choose CLI when osv-scanner is installed', () => {
      const plan = resolveRunner('osv', {
        hasCmd: (cmd) => cmd === 'osv-scanner',
        hasDocker: () => false,
      });
      expect(plan.type).toBe('cli');
      expect(plan.cmd).toContain('osv-scanner --lockfile=package-lock.json');
    });

    it('should choose Docker when osv-scanner is missing but Docker is available', () => {
      const plan = resolveRunner('osv', {
        hasCmd: () => false,
        hasDocker: () => true,
        cwd: '/mock/repo',
      });
      expect(plan.type).toBe('docker');
      expect(plan.cmd).toContain('ghcr.io/google/osv-scanner:latest');
    });

    it('should report missing when neither is available', () => {
      const plan = resolveRunner('osv', {
        hasCmd: () => false,
        hasDocker: () => false,
      });
      expect(plan.type).toBe('missing');
    });
  });

  describe('resolveRunner - Gitleaks', () => {
    it('should choose CLI when gitleaks is installed', () => {
      const plan = resolveRunner('gitleaks', {
        hasCmd: (cmd) => cmd === 'gitleaks',
        hasDocker: () => false,
      });
      expect(plan.type).toBe('cli');
      expect(plan.cmd).toContain('gitleaks detect');
    });

    it('should fallback to check-secrets.js when gitleaks and Docker are missing', () => {
      const plan = resolveRunner('gitleaks', {
        hasCmd: () => false,
        hasDocker: () => false,
      });
      expect(plan.type).toBe('fallback');
      expect(plan.cmd).toBe('node scripts/check-secrets.js');
    });
  });

  describe('resolveRunner - Zizmor', () => {
    it('should choose native zizmor if available', () => {
      const plan = resolveRunner('zizmor', {
        hasCmd: (cmd) => cmd === 'zizmor',
      });
      expect(plan.type).toBe('cli');
      expect(plan.cmd).toBe('zizmor .');
    });

    it('should choose uvx if zizmor is not present but uvx is', () => {
      const plan = resolveRunner('zizmor', {
        hasCmd: (cmd) => cmd === 'uvx',
      });
      expect(plan.type).toBe('cli');
      expect(plan.cmd).toBe('uvx zizmor .');
    });

    it('should report missing when no runner is found', () => {
      const plan = resolveRunner('zizmor', {
        hasCmd: () => false,
      });
      expect(plan.type).toBe('missing');
      expect(plan.instructions).toContain('cargo install zizmor');
    });
  });

  describe('resolveRunner - DAST & CodeQL', () => {
    it('should require Docker for local DAST', () => {
      const missingPlan = resolveRunner('dast', { hasDocker: () => false });
      expect(missingPlan.type).toBe('missing');

      const dockerPlan = resolveRunner('dast', { hasDocker: () => true });
      expect(dockerPlan.type).toBe('docker');
      expect(dockerPlan.cmd).toContain('zap-baseline.py');
    });

    it('should check CodeQL CLI', () => {
      const cliPlan = resolveRunner('codeql', { hasCmd: (c) => c === 'codeql' });
      expect(cliPlan.type).toBe('cli');

      const missingPlan = resolveRunner('codeql', { hasCmd: () => false });
      expect(missingPlan.type).toBe('missing');
    });
  });
});
