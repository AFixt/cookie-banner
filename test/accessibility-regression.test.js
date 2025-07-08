/**
 * Accessibility regression testing with baseline storage
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = path.join(__dirname, 'accessibility-baselines');

// Ensure baseline directory exists
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

test.describe('Accessibility Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    const testPath = path.resolve(__dirname, './test-page.html');
    await page.goto(`file://${testPath}`);
    
    // Clear localStorage to ensure banner shows
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.waitForSelector('#cookie-banner', { timeout: 10000 });
  });

  test('should maintain accessibility baseline - initial state', async ({ page }) => {
    const testName = 'initial-state';
    const baselinePath = path.join(BASELINE_DIR, `${testName}.json`);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // If baseline exists, compare; otherwise create it
    if (fs.existsSync(baselinePath)) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      
      // Compare violation counts by rule
      const currentViolations = accessibilityScanResults.violations.reduce((acc, violation) => {
        acc[violation.id] = violation.nodes.length;
        return acc;
      }, {});
      
      const baselineViolations = baseline.violations.reduce((acc, violation) => {
        acc[violation.id] = violation.nodes.length;
        return acc;
      }, {});
      
      // Check if any new violations were introduced
      for (const [ruleId, count] of Object.entries(currentViolations)) {
        const baselineCount = baselineViolations[ruleId] || 0;
        if (count > baselineCount) {
          throw new Error(`Accessibility regression detected: Rule "${ruleId}" has ${count} violations (was ${baselineCount})`);
        }
      }
      
      // No violations should exist in either case
      expect(accessibilityScanResults.violations).toEqual([]);
    } else {
      // Create new baseline
      fs.writeFileSync(baselinePath, JSON.stringify(accessibilityScanResults, null, 2));
      console.log(`Created accessibility baseline: ${baselinePath}`);
      
      // No violations should exist
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should maintain accessibility baseline - modal open', async ({ page }) => {
    // Open the modal
    await page.click('#customize-preferences');
    await page.waitForSelector('#cookie-modal:not([hidden])');
    
    const testName = 'modal-open';
    const baselinePath = path.join(BASELINE_DIR, `${testName}.json`);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    if (fs.existsSync(baselinePath)) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      
      const currentViolations = accessibilityScanResults.violations.reduce((acc, violation) => {
        acc[violation.id] = violation.nodes.length;
        return acc;
      }, {});
      
      const baselineViolations = baseline.violations.reduce((acc, violation) => {
        acc[violation.id] = violation.nodes.length;
        return acc;
      }, {});
      
      for (const [ruleId, count] of Object.entries(currentViolations)) {
        const baselineCount = baselineViolations[ruleId] || 0;
        if (count > baselineCount) {
          throw new Error(`Accessibility regression detected in modal: Rule "${ruleId}" has ${count} violations (was ${baselineCount})`);
        }
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    } else {
      fs.writeFileSync(baselinePath, JSON.stringify(accessibilityScanResults, null, 2));
      console.log(`Created accessibility baseline: ${baselinePath}`);
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should monitor color contrast ratios', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    // Check for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      const violationDetails = contrastViolations.map(violation => ({
        description: violation.description,
        help: violation.help,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          failureSummary: node.failureSummary
        }))
      }));
      
      throw new Error(`Color contrast violations detected: ${JSON.stringify(violationDetails, null, 2)}`);
    }

    expect(contrastViolations).toEqual([]);
  });

  test('should validate keyboard accessibility patterns', async ({ page }) => {
    // Test focus order and keyboard traps
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['focusable-content', 'tabindex', 'focus-order-semantics'])
      .analyze();

    const keyboardViolations = accessibilityScanResults.violations.filter(
      violation => ['focusable-content', 'tabindex', 'focus-order-semantics'].includes(violation.id)
    );

    expect(keyboardViolations).toEqual([]);
  });

  test('should validate ARIA usage', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .withRules([
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr-value',
        'aria-valid-attr',
        'aria-hidden-body',
        'aria-roles'
      ])
      .analyze();

    const ariaViolations = accessibilityScanResults.violations.filter(
      violation => violation.id.startsWith('aria-')
    );

    if (ariaViolations.length > 0) {
      const violationDetails = ariaViolations.map(violation => ({
        id: violation.id,
        description: violation.description,
        help: violation.help,
        nodes: violation.nodes.length
      }));
      
      throw new Error(`ARIA violations detected: ${JSON.stringify(violationDetails, null, 2)}`);
    }

    expect(ariaViolations).toEqual([]);
  });

  test('should generate accessibility report', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      testInfo: {
        totalRules: accessibilityScanResults.testEngine.version,
        executedRules: accessibilityScanResults.testRunner.name
      },
      summary: {
        violations: accessibilityScanResults.violations.length,
        passes: accessibilityScanResults.passes.length,
        incomplete: accessibilityScanResults.incomplete.length,
        inapplicable: accessibilityScanResults.inapplicable.length
      },
      violations: accessibilityScanResults.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodeCount: violation.nodes.length,
        tags: violation.tags
      })),
      passes: accessibilityScanResults.passes.map(pass => ({
        id: pass.id,
        description: pass.description,
        nodeCount: pass.nodes.length
      }))
    };

    // Save report
    const reportPath = path.join(BASELINE_DIR, `accessibility-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`Accessibility report generated: ${reportPath}`);
    console.log(`Summary: ${report.summary.violations} violations, ${report.summary.passes} passes`);

    // Test should pass even if report is generated
    expect(true).toBe(true);
  });
});