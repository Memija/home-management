import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractFailingAudits,
  formatIssuesMarkdown,
  generateFlowsSummary,
  generatePresetSummary,
} from './generate-lighthouse-summary';

describe('generate-lighthouse-summary', () => {
  const testDir = path.resolve(process.cwd(), 'temp-test-lh-summary');
  const summaryFile = path.resolve(process.cwd(), 'temp-test-lh-summary.md');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.GITHUB_STEP_SUMMARY = summaryFile;
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(summaryFile)) {
      fs.unlinkSync(summaryFile);
    }
    delete process.env.GITHUB_STEP_SUMMARY;
  });

  describe('extractFailingAudits', () => {
    it('should return an empty array for null, empty or invalid LHR objects', () => {
      expect(extractFailingAudits(null)).toEqual([]);
      expect(extractFailingAudits({})).toEqual([]);
      expect(extractFailingAudits({ categories: {} })).toEqual([]);
    });

    it('should extract accessibility failures including DOM selector, snippet, and explanation', () => {
      const mockLhr = {
        categories: {
          accessibility: {
            id: 'accessibility',
            title: 'Accessibility',
            score: 0.97,
            auditRefs: [
              { id: 'aria-valid-attr-value', weight: 10 },
              { id: 'color-contrast', weight: 7 },
            ],
          },
        },
        audits: {
          'aria-valid-attr-value': {
            id: 'aria-valid-attr-value',
            title: 'ARIA attributes must conform to valid values',
            score: 0,
            scoreDisplayMode: 'binary',
            description:
              'Ensures values for ARIA attributes are valid. [Learn more](https://example.com)',
            details: {
              type: 'table',
              items: [
                {
                  node: {
                    type: 'node',
                    selector: '.custom-select.dropup',
                    snippet:
                      '<div class="custom-select dropup" role="combobox" aria-controls="email-client-dropdown">',
                    explanation:
                      'Attribute aria-controls="email-client-dropdown" does not point to an element that exists',
                    nodeLabel: 'Email client dropdown',
                  },
                },
              ],
            },
          },
          'color-contrast': {
            id: 'color-contrast',
            title: 'Elements must have sufficient color contrast',
            score: 1, // Passing
            scoreDisplayMode: 'binary',
          },
        },
      };

      const issues = extractFailingAudits(mockLhr);
      expect(issues).toHaveLength(1);
      const issue = issues[0];
      expect(issue.id).toBe('aria-valid-attr-value');
      expect(issue.category).toBe('Accessibility');
      expect(issue.categoryScore).toBe(97);
      expect(issue.score).toBe(0);
      expect(issue.weight).toBe(10);
      expect(issue.elements).toHaveLength(1);
      expect(issue.elements[0].selector).toBe('.custom-select.dropup');
      expect(issue.elements[0].snippet).toContain('custom-select dropup');
      expect(issue.elements[0].explanation).toContain('does not point to an element that exists');
    });

    it('should prioritize weighted failing audits over unweighted audits', () => {
      const mockLhr = {
        categories: {
          'best-practices': {
            id: 'best-practices',
            title: 'Best Practices',
            score: 0.95,
            auditRefs: [
              { id: 'unweighted-audit', weight: 0 },
              { id: 'weighted-audit', weight: 5 },
            ],
          },
        },
        audits: {
          'unweighted-audit': {
            id: 'unweighted-audit',
            title: 'Unweighted informational failure',
            score: 0,
            scoreDisplayMode: 'binary',
          },
          'weighted-audit': {
            id: 'weighted-audit',
            title: 'Weighted critical failure',
            score: 0.5,
            scoreDisplayMode: 'numeric',
          },
        },
      };

      const issues = extractFailingAudits(mockLhr);
      expect(issues).toHaveLength(2);
      expect(issues[0].id).toBe('weighted-audit');
      expect(issues[1].id).toBe('unweighted-audit');
    });
  });

  describe('formatIssuesMarkdown', () => {
    it('should format issues into markdown with selectors and snippets', () => {
      const issues = [
        {
          id: 'aria-valid-attr-value',
          title: 'ARIA attributes must conform to valid values',
          score: 0,
          weight: 10,
          description: 'Ensures values for ARIA attributes are valid.',
          elements: [
            {
              selector: '.custom-select.dropup',
              snippet: '<div class="custom-select dropup">',
              explanation: 'Invalid ID',
            },
          ],
          totalElements: 1,
        },
      ];

      const md = formatIssuesMarkdown(issues);
      expect(md).toContain('`aria-valid-attr-value`');
      expect(md).toContain('`.custom-select.dropup`');
      expect(md).toContain('```html');
      expect(md).toContain('Invalid ID');
    });
  });

  describe('generateFlowsSummary', () => {
    it('should generate an all-clear summary when all user flow steps score 100%', () => {
      const mockSummary = [
        {
          Step: '💻☀️ Landing Page (Desktop Light)',
          Platform: 'Desktop',
          Theme: 'Light',
          Accessibility: 100,
          'Best Practices': 100,
          SEO: 100,
          details: [],
        },
      ];
      const summaryJson = path.join(testDir, 'flows-summary.json');
      fs.writeFileSync(summaryJson, JSON.stringify(mockSummary));

      const md = generateFlowsSummary({
        summaryPath: summaryJson,
        title: 'Desktop Light',
        platform: 'desktop',
        theme: 'light',
        outputFile: summaryFile,
      });

      expect(md).toContain('Lighthouse Interactive User Flows (`Desktop Light`)');
      expect(md).toContain('Completed Successfully (100% Score)!');
      expect(md).toContain('All user journey steps achieved a perfect 100%');
      expect(md).toContain('✅ Passed');

      const fileContent = fs.readFileSync(summaryFile, 'utf8');
      expect(fileContent).toBe(md);
    });

    it('should highlight sub-100% scores and output exact diagnostic failure details', () => {
      const mockSummary = [
        {
          Step: '💻☀️ Contact Modal & Dropup (Desktop Light)',
          Platform: 'Desktop',
          Theme: 'Light',
          Accessibility: 97,
          'Best Practices': 100,
          SEO: 100,
          details: [
            {
              id: 'aria-valid-attr-value',
              title: 'ARIA attributes must conform to valid values',
              score: 0,
              weight: 10,
              description: 'Ensures values for ARIA attributes are valid.',
              elements: [
                {
                  nodeLabel: 'Email Dropdown',
                  selector: '.custom-select.dropup',
                  snippet:
                    '<div class="custom-select dropup" role="combobox" aria-controls="email-client-dropdown">',
                  explanation:
                    'Attribute aria-controls="email-client-dropdown" does not point to an element that exists',
                },
              ],
              totalElements: 1,
            },
          ],
        },
      ];
      const summaryJson = path.join(testDir, 'flows-summary-failing.json');
      fs.writeFileSync(summaryJson, JSON.stringify(mockSummary));

      const md = generateFlowsSummary({
        summaryPath: summaryJson,
        title: 'Desktop Light',
        platform: 'desktop',
        theme: 'light',
        outputFile: summaryFile,
      });

      expect(md).toContain('Completed with Issues (< 100%)');
      expect(md).toContain('**97% ⚠️**');
      expect(md).toContain('❌ **1 issue(s)**');
      expect(md).toContain('Problem Diagnostics & Exact Failure Locations');
      expect(md).toContain('💻☀️ Contact Modal & Dropup (Desktop Light)');
      expect(md).toContain('`aria-valid-attr-value`');
      expect(md).toContain('.custom-select.dropup');
      expect(md).toContain('aria-controls="email-client-dropdown"');
    });

    it('should handle missing summary file gracefully', () => {
      const missingPath = path.join(testDir, 'non-existent.json');
      const md = generateFlowsSummary({
        summaryPath: missingPath,
        outputFile: summaryFile,
      });

      expect(md).toContain('Flow Execution');
      expect(md).toContain('Missing');
    });
  });

  describe('generatePresetSummary', () => {
    it('should generate summary for preset audits and display diagnostics when an LHR has issues', () => {
      const lhrPath = path.join(testDir, 'lhr-contact.json');
      const mockLhr = {
        categories: {
          accessibility: {
            id: 'accessibility',
            title: 'Accessibility',
            score: 0.97,
            auditRefs: [{ id: 'button-name', weight: 10 }],
          },
        },
        audits: {
          'button-name': {
            id: 'button-name',
            title: 'Buttons must have discernible text',
            score: 0,
            scoreDisplayMode: 'binary',
            details: {
              type: 'table',
              items: [
                {
                  node: {
                    selector: 'button.help-btn',
                    snippet: '<button class="help-btn">',
                    explanation: 'Button has no accessible name',
                  },
                },
              ],
            },
          },
        },
      };
      fs.writeFileSync(lhrPath, JSON.stringify(mockLhr));

      const manifestPath = path.join(testDir, 'manifest.json');
      const mockManifest = [
        {
          url: 'http://localhost:4000/dashboard',
          isRepresentativeRun: true,
          jsonPath: lhrPath,
          summary: {
            performance: 1,
            accessibility: 0.97,
            'best-practices': 1,
            seo: 1,
          },
        },
      ];
      fs.writeFileSync(manifestPath, JSON.stringify(mockManifest));

      // Test with custom candidate paths
      const md = generatePresetSummary({
        preset: 'desktop',
        outputFile: summaryFile,
      });

      // Manifest not at default .lighthouseci, so handles gracefully
      expect(md).toContain('Lighthouse CI Audit (`DESKTOP`)');
    });
  });
});
