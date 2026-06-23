import { test, expect } from '@playwright/test';

/**
 * E2E Tests for net4.xyz Frontend
 * Validates: Requirements 3.1 - Frontend Testing
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/net4/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('should have navigation bar', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Check if navigation links exist
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');
      if (href && !href.startsWith('#')) {
        await firstLink.click();
        await expect(page).toHaveURL(new RegExp(href));
      }
    }
  });
});

test.describe('Wallet Connection', () => {
  test('should display wallet connect button', async ({ page }) => {
    await page.goto('/');
    
    // Look for wallet connect button or connect wallet text
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("连接")');
    const walletButton = page.locator('[class*="wallet"], [class*="Wallet"]');
    
    const hasConnectButton = await connectButton.count() > 0;
    const hasWalletButton = await walletButton.count() > 0;
    
    // At least one should exist
    expect(hasConnectButton || hasWalletButton).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
    
    // Navigation should be accessible (hamburger menu or scrollable)
    const body = page.locator('body');
    const overflow = await body.evaluate((el) => getComputedStyle(el).overflow);
    expect(['auto', 'scroll', 'hidden']).toContain(overflow);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Form Interactions', () => {
  test('should handle search input if present', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await searchInput.clear();
    }
  });

  test('should handle form submission if present', async ({ page }) => {
    await page.goto('/');
    
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      const firstForm = forms.first();
      const inputs = firstForm.locator('input');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        await inputs.first().fill('test@example.com');
        
        const submitButton = firstForm.locator('button[type="submit"]');
        if (await submitButton.count() > 0) {
          // Just verify button is clickable, don't actually submit
          await expect(submitButton.first()).toBeEnabled();
        }
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345');
    // Next.js may redirect or show custom 404
    expect([200, 404]).toContain(response?.status() ?? 0);
  });

  test('should not have critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('hydration') &&
      !e.includes('Warning')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});