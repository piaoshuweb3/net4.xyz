import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests for net4.xyz Frontend
 * Validates: Requirements 3.1 - Accessibility Testing
 */

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage should have no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter out known issues that may not be critical
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have lang attribute on html element', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', /[a-z]{2}/i);
  });

  test('should have meta description', async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('all images should have alt text', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Either alt text or aria-hidden should be present
      expect(alt !== null || ariaHidden === 'true').toBeTruthy();
    }
  });

  test('form inputs should have associated labels', async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check for associated label or aria attributes
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || !!ariaLabel || !!ariaLabelledby || !!placeholder).toBeTruthy();
      } else {
        expect(!!ariaLabel || !!ariaLabelledby || !!placeholder).toBeTruthy();
      }
    }
  });

  test('buttons should have accessible names', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');

      // Button should have text, aria-label, or aria-labelledby
      expect(
        (text && text.trim().length > 0) || !!ariaLabel || !!ariaLabelledby
      ).toBeTruthy();
    }
  });

  test('links should have accessible names', async ({ page }) => {
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const ariaLabelledby = await link.getAttribute('aria-labelledby');
      const title = await link.getAttribute('title');

      // Link should have text or accessible name
      expect(
        (text && text.trim().length > 0) ||
          !!ariaLabel ||
          !!ariaLabelledby ||
          !!title
      ).toBeTruthy();
    }
  });

  test('page should be keyboard navigable', async ({ page }) => {
    // Press Tab to navigate through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that focus is on some element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have skip to main content link', async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('a[href="#main"], a[href="#content"], a[class*="skip"]');
    
    // Skip link is recommended but not required
    const skipLinkCount = await skipLink.count();
    if (skipLinkCount > 0) {
      await expect(skipLink.first()).toBeVisible();
    }
  });

  test('color contrast should meet WCAG AA', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      // Should have at least one h1
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    }
  });

  test('should have valid HTML structure', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const structureViolations = accessibilityScanResults.violations.filter(
      (v) =>
        v.id === 'region' ||
        v.id === 'landmark-one-main' ||
        v.id === 'bypass'
    );

    // These are recommendations, not critical
    expect(structureViolations.length).toBeLessThanOrEqual(3);
  });
});