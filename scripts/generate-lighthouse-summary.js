/**
 * Generates GitHub Step Summary and console reports for Lighthouse CI audits and interactive user flows.
 * Extracts failing audits, DOM selectors, HTML snippets, and detailed explanations to make issue location trivial.
 */
const fs = require('fs');
const path = require('path');

/**
 * Extracts detailed diagnostics for failing or imperfect audits from a Lighthouse Result (LHR).
 * @param {object} lhr - Lighthouse Result object
 * @returns {Array<object>} Array of structured issue details
 */
function extractFailingAudits(lhr) {
  if (!lhr || typeof lhr !== 'object' || !lhr.categories) {
    return [];
  }

  const issues = [];
  const categoriesToCheck = ['accessibility', 'best-practices', 'seo', 'performance'];

  for (const catId of categoriesToCheck) {
    const cat = lhr.categories[catId];
    if (!cat) continue;

    const catScore = cat.score != null ? Math.round(cat.score * 100) : null;

    for (const ref of cat.auditRefs || []) {
      const audit = lhr.audits?.[ref.id];
      if (!audit) continue;

      // Flag if score is below 1 or execution threw an error
      const isFailed =
        (audit.score !== null && audit.score < 1) || audit.scoreDisplayMode === 'error';
      if (!isFailed) continue;

      const elements = [];
      if (audit.details && Array.isArray(audit.details.items)) {
        for (const item of audit.details.items) {
          const el = {};
          if (item.node) {
            if (item.node.selector) el.selector = item.node.selector;
            if (item.node.snippet) el.snippet = item.node.snippet;
            if (item.node.explanation) el.explanation = item.node.explanation;
            if (item.node.nodeLabel) el.nodeLabel = item.node.nodeLabel;
          }
          if (item.selector && !el.selector) el.selector = item.selector;
          if (item.snippet && !el.snippet) el.snippet = item.snippet;
          if (item.explanation && !el.explanation) el.explanation = item.explanation;
          if (item.description && !el.explanation) el.explanation = item.description;

          if (item.source) {
            el.source =
              typeof item.source === 'object'
                ? item.source.url || JSON.stringify(item.source)
                : String(item.source);
          }
          if (item.url && !el.source) el.source = item.url;
          if (item.scriptUrl && !el.source) el.source = item.scriptUrl;

          if (item.subItems?.items?.length) {
            el.subItems = item.subItems.items.map(
              (sub) => sub.error || sub.message || JSON.stringify(sub),
            );
          }

          if (Object.keys(el).length > 0) {
            elements.push(el);
          }
        }
      }

      // Clean up documentation link from description if needed
      const cleanDescription = (audit.description || '').replace(/\s*\[Learn more\].*$/i, '');

      issues.push({
        category: cat.title || catId,
        categoryId: catId,
        categoryScore: catScore,
        id: audit.id,
        title: audit.title,
        score: audit.score,
        weight: ref.weight || 0,
        displayValue: audit.displayValue || null,
        explanation: audit.explanation || null,
        errorMessage: audit.errorMessage || null,
        description: cleanDescription,
        elements: elements.slice(0, 5),
        totalElements: elements.length,
      });
    }
  }

  // Sort weighted failures first, then by lowest score
  issues.sort((a, b) => {
    if (b.weight > 0 !== a.weight > 0) {
      return b.weight > 0 ? 1 : -1;
    }
    return (a.score ?? 1) - (b.score ?? 1);
  });

  return issues;
}

/**
 * Formats diagnostic Markdown for a list of detected issues.
 * @param {Array<object>} issues - List of issue objects from extractFailingAudits
 * @returns {string} Formatted Markdown block
 */
function formatIssuesMarkdown(issues) {
  if (!issues || issues.length === 0) return '';

  let md = '';
  for (const issue of issues) {
    const scoreText = issue.score != null ? `${Math.round(issue.score * 100)}%` : 'Error';
    const weightBadge = issue.weight > 0 ? `*(Weight: ${issue.weight})*` : '*(Informational)*';
    md += `- ❌ **${issue.title}** (\`${issue.id}\`) — Score: \`${scoreText}\` ${weightBadge}\n`;

    if (issue.description) {
      md += `  - **Rule Description:** ${issue.description}\n`;
    }
    if (issue.explanation) {
      md += `  - **Audit Note:** ${issue.explanation}\n`;
    }
    if (issue.errorMessage) {
      md += `  - **Error Message:** \`${issue.errorMessage}\`\n`;
    }

    if (issue.elements && issue.elements.length > 0) {
      md += `  - **Problem Elements & Locations:**\n`;
      issue.elements.forEach((el, idx) => {
        md += `    ${idx + 1}. `;
        if (el.nodeLabel) md += `**${el.nodeLabel}**: `;
        if (el.selector) md += `\`${el.selector}\`\n`;
        else if (el.source) md += `\`${el.source}\`\n`;
        else md += `Element details below\n`;

        if (el.snippet) {
          md += `       \`\`\`html\n       ${el.snippet}\n       \`\`\`\n`;
        }
        if (el.explanation) {
          md += `       *Why this failed:* ${el.explanation}\n`;
        }
        if (el.subItems && el.subItems.length > 0) {
          md += `       *Details:* ${el.subItems.join('; ')}\n`;
        }
      });

      if (issue.totalElements > issue.elements.length) {
        md += `    *(...and ${issue.totalElements - issue.elements.length} more element(s))*\n`;
      }
    }
  }

  return md;
}

/**
 * Generates the user flows GitHub Step Summary from .lighthouseci/lighthouse-userflow-summary.json.
 * @param {object} options
 * @returns {string} Generated Markdown
 */
function generateFlowsSummary(options = {}) {
  const summaryPath =
    options.summaryPath ||
    path.resolve(process.cwd(), '.lighthouseci/lighthouse-userflow-summary.json');
  const title = options.title || process.env.TITLE || 'User Flows';
  const platform = options.platform || process.env.PLATFORM || 'desktop';
  const theme = options.theme || process.env.THEME || 'light';
  const jobStatus = options.jobStatus || process.env.JOB_STATUS || 'success';
  const outputFile =
    options.outputFile !== undefined ? options.outputFile : process.env.GITHUB_STEP_SUMMARY;

  let md = `## 🔄 Lighthouse Interactive User Flows (\`${title}\`)\n\n`;

  try {
    if (!fs.existsSync(summaryPath)) {
      const status = jobStatus === 'success' ? '✅ Flows Passed' : '⚠️ Flows Completed or Failed';
      md += '| Metric | Status |\n';
      md += '| :--- | :--- |\n';
      md += `| **Flow Execution** | ${status} |\n`;
      md += `| **Summary File** | Missing (\`${summaryPath}\`) |\n`;
    } else {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const hasIssues = summary.some((row) => {
        const a11y = Number(row.Accessibility);
        const bp = Number(row['Best Practices']);
        const seo = Number(row.SEO);
        const hasLowScore =
          (!isNaN(a11y) && a11y < 100) || (!isNaN(bp) && bp < 100) || (!isNaN(seo) && seo < 100);
        const weightedIssues = (Array.isArray(row.details) ? row.details : []).filter(
          (issue) => (issue.weight || 0) > 0,
        );
        return hasLowScore || weightedIssues.length > 0;
      });

      if (hasIssues) {
        md += `### ⚠️ User Journey Flows (${title}) Completed with Issues (< 100%)\n\n`;
      } else {
        md += `### ✅ User Journey Flows (${title}) Completed Successfully (100% Score)!\n\n`;
      }

      md +=
        '| Step / Interaction | Platform | Theme | Accessibility | Best Practices | SEO | Status |\n';
      md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

      const stepsWithIssues = [];

      for (const row of summary) {
        const step = (row.Step || 'Interaction').replace(/\|/g, '\\|');
        const a11yVal = Number(row.Accessibility);
        const bpVal = Number(row['Best Practices']);
        const seoVal = Number(row.SEO);

        const a11y =
          !isNaN(a11yVal) && a11yVal < 100
            ? `**${a11yVal}% ⚠️**`
            : row.Accessibility != null
              ? `${row.Accessibility}%`
              : 'N/A';
        const bp =
          !isNaN(bpVal) && bpVal < 100
            ? `**${bpVal}% ⚠️**`
            : row['Best Practices'] != null
              ? `${row['Best Practices']}%`
              : 'N/A';
        const seo =
          !isNaN(seoVal) && seoVal < 100
            ? `**${seoVal}% ⚠️**`
            : row.SEO != null
              ? `${row.SEO}%`
              : 'N/A';

        const rowIssues = Array.isArray(row.details) ? row.details : [];
        const weightedIssues = rowIssues.filter((issue) => (issue.weight || 0) > 0);
        const informationalIssues = rowIssues.filter((issue) => (issue.weight || 0) === 0);

        const hasLowScore =
          (!isNaN(a11yVal) && a11yVal < 100) ||
          (!isNaN(bpVal) && bpVal < 100) ||
          (!isNaN(seoVal) && seoVal < 100);

        const isProblematic = hasLowScore || weightedIssues.length > 0;

        const statusCell = isProblematic
          ? `❌ **${weightedIssues.length > 0 ? `${weightedIssues.length} issue(s)` : 'Sub-100%'}**`
          : informationalIssues.length > 0
            ? `ℹ️ **${informationalIssues.length} note(s)**`
            : '✅ Passed';

        md += `| ${step} | ${row.Platform || 'N/A'} | ${row.Theme || 'N/A'} | ${a11y} | ${bp} | ${seo} | ${statusCell} |\n`;

        if (isProblematic || informationalIssues.length > 0) {
          stepsWithIssues.push({
            step: row.Step,
            platform: row.Platform,
            theme: row.Theme,
            a11yVal,
            bpVal,
            seoVal,
            issues: rowIssues,
          });
        }
      }

      if (stepsWithIssues.length > 0) {
        md += `\n### 🔍 Problem Diagnostics & Exact Failure Locations\n\n`;
        if (hasIssues) {
          md += `> [!WARNING]\n`;
          md += `> The following user journey step(s) did not achieve 100%. Review the failing audits and DOM element locations below:\n\n`;
        } else {
          md += `> [!NOTE]\n`;
          md += `> All user journey steps achieved 100% scores. The following informational notes and best-practice suggestions were identified:\n\n`;
        }

        for (const item of stepsWithIssues) {
          md += `#### ${item.step} (${item.platform} - ${item.theme})\n\n`;
          md += `- **Scores:** Accessibility: \`${item.a11yVal}%\` | Best Practices: \`${item.bpVal}%\` | SEO: \`${item.seoVal}%\`\n`;

          if (item.issues.length > 0) {
            md += formatIssuesMarkdown(item.issues);
          } else {
            md += `- ⚠️ Score was below 100%, but no specific audit items were captured in summary details.\n`;
          }
          md += '\n';
        }
      } else {
        md += `\n> [!NOTE]\n`;
        md += `> All user journey steps achieved a perfect 100% across Accessibility, Best Practices, and SEO! 🎉\n`;
      }

      md += `\n> [!TIP]\n`;
      md += `> Full interactive flow timeline trace and HTML report are saved in the \`lighthouse-userflow-report-${platform}-${theme}\` artifact.\n`;
    }
  } catch (err) {
    md += `### ⚠️ Failed to parse summary: ${err.message}\n`;
  }

  if (outputFile) {
    fs.appendFileSync(outputFile, md, 'utf8');
  } else {
    console.log(md);
  }

  return md;
}

/**
 * Generates the preset audit GitHub Step Summary from .lighthouseci/${preset}/manifest.json.
 * @param {object} options
 * @returns {string} Generated Markdown
 */
function generatePresetSummary(options = {}) {
  const preset = options.preset || process.env.PRESET || 'desktop';
  const jobStatus = options.jobStatus || process.env.JOB_STATUS || 'success';
  const outputFile =
    options.outputFile !== undefined ? options.outputFile : process.env.GITHUB_STEP_SUMMARY;

  let md = `## ⚡ Lighthouse CI Audit (\`${preset.toUpperCase()}\`)\n\n`;

  try {
    const candidatePaths = [
      path.resolve(process.cwd(), `.lighthouseci/${preset}/manifest.json`),
      path.resolve(process.cwd(), '.lighthouseci/manifest.json'),
    ];
    const manifestPath = candidatePaths.find((p) => fs.existsSync(p));

    if (!manifestPath) {
      const status =
        jobStatus === 'success' ? '✅ Audit Passed' : '⚠️ Audit Completed with Warnings/Failures';
      md += '| Metric | Status |\n';
      md += '| :--- | :--- |\n';
      md += `| **Device Preset** | \`${preset}\` |\n`;
      md += `| **Audit Status** | ${status} |\n`;
    } else {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const runs = manifest.filter((r) => r.isRepresentativeRun !== false);
      const items = runs.length > 0 ? runs : manifest;

      const hasFailures = items.some((run) => {
        if (!run.summary) return false;
        return (
          run.summary.performance < 1 ||
          run.summary.accessibility < 1 ||
          run.summary['best-practices'] < 1 ||
          run.summary.seo < 1
        );
      });

      const statusIcon = jobStatus === 'success' && !hasFailures ? '✅' : '⚠️';
      const statusText = hasFailures
        ? `Audit Completed with Sub-100% Scores`
        : `Audit Completed Successfully (100% Target Met)!`;
      md += `### ${statusIcon} ${statusText}\n\n`;

      md += '| Route / Page | Performance | Accessibility | Best Practices | SEO | Status |\n';
      md += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';

      const failingPages = [];

      for (const run of items) {
        const url = (run.url || '/').replace(/^http:\/\/[^/]+/, '') || '/';
        const perfVal = run.summary ? Math.round(run.summary.performance * 100) : null;
        const a11yVal = run.summary ? Math.round(run.summary.accessibility * 100) : null;
        const bpVal = run.summary ? Math.round(run.summary['best-practices'] * 100) : null;
        const seoVal = run.summary ? Math.round(run.summary.seo * 100) : null;

        const perf =
          perfVal != null && perfVal < 100
            ? `**${perfVal}% ⚠️**`
            : perfVal != null
              ? `${perfVal}%`
              : 'N/A';
        const a11y =
          a11yVal != null && a11yVal < 100
            ? `**${a11yVal}% ⚠️**`
            : a11yVal != null
              ? `${a11yVal}%`
              : 'N/A';
        const bp =
          bpVal != null && bpVal < 100 ? `**${bpVal}% ⚠️**` : bpVal != null ? `${bpVal}%` : 'N/A';
        const seo =
          seoVal != null && seoVal < 100
            ? `**${seoVal}% ⚠️**`
            : seoVal != null
              ? `${seoVal}%`
              : 'N/A';

        const isProblematic =
          (a11yVal != null && a11yVal < 100) ||
          (bpVal != null && bpVal < 100) ||
          (seoVal != null && seoVal < 100) ||
          (perfVal != null && perfVal < 100);

        const statusCell = isProblematic ? '⚠️ Review Needed' : '✅ 100%';

        md += `| \`${url}\` | ${perf} | ${a11y} | ${bp} | ${seo} | ${statusCell} |\n`;

        if (isProblematic && run.jsonPath && fs.existsSync(run.jsonPath)) {
          try {
            const lhr = JSON.parse(fs.readFileSync(run.jsonPath, 'utf8'));
            const issues = extractFailingAudits(lhr);
            if (issues.length > 0) {
              failingPages.push({ url, issues });
            }
          } catch {
            // Ignore parse errors on individual run LHR
          }
        }
      }

      if (failingPages.length > 0) {
        md += `\n### 🔍 Problem Diagnostics & Exact Failure Locations\n\n`;
        md += `> [!WARNING]\n`;
        md += `> One or more audited routes scored below 100%. Review the exact failing audits and affected elements below:\n\n`;

        for (const item of failingPages) {
          md += `#### Route: \`${item.url}\`\n\n`;
          md += formatIssuesMarkdown(item.issues);
          md += '\n';
        }
      }

      md += `\n> [!TIP]\n`;
      md += `> Detailed HTML reports with interactive traces and audits are saved in the \`lighthouse-report-${preset}\` artifact.\n`;
    }
  } catch (err) {
    const status = jobStatus === 'success' ? '✅ Audit Passed' : '⚠️ Audit Completed';
    md += '| Metric | Status |\n';
    md += '| :--- | :--- |\n';
    md += `| **Device Preset** | \`${preset}\` |\n`;
    md += `| **Audit Status** | ${status} |\n`;
    md += `| **Error** | ${err.message} |\n`;
  }

  if (outputFile) {
    fs.appendFileSync(outputFile, md, 'utf8');
  } else {
    console.log(md);
  }

  return md;
}

if (require.main === module) {
  const mode = process.argv[2] || 'flows';
  if (mode === 'preset') {
    generatePresetSummary();
  } else {
    generateFlowsSummary();
  }
}

module.exports = {
  extractFailingAudits,
  formatIssuesMarkdown,
  generateFlowsSummary,
  generatePresetSummary,
};
