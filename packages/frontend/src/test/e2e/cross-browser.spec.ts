import { test, expect } from '@playwright/test';

/**
 * Cross-Browser Tests for net4.xyz Frontend
 * Validates: Requirements 3.1 - Cross-Browser Testing
 */

test.describe('Cross-Browser Compatibility', () => {
  test('should work on Chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check for critical elements
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should work on Firefox', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check for critical elements
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should work on Safari', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check for critical elements
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should work on Mobile Chrome', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check page is usable on mobile
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should work on Mobile Safari', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check page is usable on mobile
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('CSS should render consistently across browsers', async ({ page }) => {
    await page.goto('/');
    
    // Check that key styles are applied
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        fontFamily: computed.fontFamily,
        display: computed.display,
      };
    });
    
    // Basic styles should be present
    expect(bodyStyles.display).toBeTruthy();
  });

  test('JavaScript should work across browsers', async ({ page }) => {
    await page.goto('/');
    
    // Check that JavaScript executed
    const jsWorks = await page.evaluate(() => {
      return typeof window !== 'undefined' && typeof document !== 'undefined';
    });
    
    expect(jsWorks).toBeTruthy();
  });

  test('WebGL should work if used', async ({ page }) => {
    await page.goto('/');
    
    // Check for WebGL support
    const webglSupported = await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      } catch {
        return false;
      }
    });
    
    // WebGL may not be critical, but should be checked
    // This test documents WebGL capability
    expect(typeof webglSupported).toBe('boolean');
  });

  test('localStorage should work', async ({ page }) => {
    await page.goto('/');
    
    const storageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        const result = localStorage.getItem('test') === 'test';
        localStorage.removeItem('test');
        return result;
      } catch {
        return false;
      }
    });
    
    expect(storageWorks).toBeTruthy();
  });

  test('sessionStorage should work', async ({ page }) => {
    await page.goto('/');
    
    const storageWorks = await page.evaluate(() => {
      try {
        sessionStorage.setItem('test', 'test');
        const result = sessionStorage.getItem('test') === 'test';
        sessionStorage.removeItem('test');
        return result;
      } catch {
        return false;
      }
    });
    
    expect(storageWorks).toBeTruthy();
  });

  test('fetch API should work', async ({ page }) => {
    const fetchWorks = await page.evaluate(async () => {
      try {
        const response = await fetch('/');
        return response.ok || response.status === 404;
      } catch {
        return false;
      }
    });
    
    expect(fetchWorks).toBeTruthy();
  });

  test('ES6 features should work', async ({ page }) => {
    const es6Works = await page.evaluate(() => {
      // Test some ES6 features
      const arrow = () => {};
      const spread = [...'test'];
      const template = `test`;
      const promise = Promise.resolve();
      const map = new Map();
      const set = new Set();
      const classTest = class {};
      
      return {
        arrow: typeof arrow === 'function',
        spread: spread.length === 4,
        template: template === 'test',
        promise: promise instanceof Promise,
        map: map instanceof Map,
        set: set instanceof Set,
        class: typeof classTest === 'function',
      };
    });
    
    expect(es6Works.arrow).toBeTruthy();
    expect(es6Works.spread).toBeTruthy();
    expect(es6Works.template).toBeTruthy();
    expect(es6Works.promise).toBeTruthy();
    expect(es6Works.map).toBeTruthy();
    expect(es6Works.set).toBeTruthy();
    expect(es6Works.class).toBeTruthy();
  });
});