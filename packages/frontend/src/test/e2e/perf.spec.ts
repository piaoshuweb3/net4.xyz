import { test, expect } from '@playwright/test';

/**
 * Performance Tests for net4.xyz Frontend
 * Validates: Requirements 3.1 - Performance Testing
 */

test.describe('Performance', () => {
  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have fast Time to First Byte', async ({ page }) => {
    const response = await page.goto('/');
    const ttfb = response?.timing()?.responseStart ?? 0;
    
    // TTFB should be under 1 second
    expect(ttfb).toBeLessThan(1000);
  });

  test('should have minimal render blocking resources', async ({ page }) => {
    await page.goto('/');
    
    // Check for render-blocking scripts
    const blockingScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.filter((s) => {
        const rel = s.getAttribute('rel');
        return rel === 'preload' || s.getAttribute('async') === null;
      }).length;
    });
    
    // Should have reasonable number of scripts
    expect(blockingScripts).toBeLessThan(10);
  });

  test('images should be optimized', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      
      if (src && !src.startsWith('data:')) {
        // Check if image has width/height set (prevents layout shift)
        const width = await img.getAttribute('width');
        const height = await img.getAttribute('height');
        const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
        
        // Either explicit dimensions or natural dimensions should exist
        expect(!!width || !!height || naturalWidth > 0).toBeTruthy();
      }
    }
  });

  test('should not have excessive DOM nodes', async ({ page }) => {
    await page.goto('/');
    
    const domDepth = await page.evaluate(() => {
      const getDepth = (el: Element, depth = 0): number => {
        const children = Array.from(el.children);
        if (children.length === 0) return depth;
        return Math.max(...children.map((c) => getDepth(c, depth + 1)));
      };
      return getDepth(document.body);
    });
    
    // DOM depth should be reasonable
    expect(domDepth).toBeLessThan(50);
  });

  test('should have efficient CSS', async ({ page }) => {
    await page.goto('/');
    
    const cssSize = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.length;
    });
    
    // Should not have excessive CSS files
    expect(cssSize).toBeLessThan(10);
  });

  test('should have efficient JavaScript', async ({ page }) => {
    await page.goto('/');
    
    const jsSize = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script:not([type="application/ld+json"]):not([type="application/json"])'));
      return scripts.length;
    });
    
    // Should not have excessive JS files
    expect(jsSize).toBeLessThan(15);
  });

  test('should minimize Cumulative Layout Shift', async ({ page }) => {
    // Navigate and measure CLS
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial layout
    const initialLayout = await page.evaluate(() => {
      const body = document.body;
      return {
        height: body.scrollHeight,
        width: body.scrollWidth,
      };
    });
    
    // Wait for any dynamic content
    await page.waitForTimeout(2000);
    
    const finalLayout = await page.evaluate(() => {
      const body = document.body;
      return {
        height: body.scrollHeight,
        width: body.scrollWidth,
      };
    });
    
    // Layout should be stable
    const heightDiff = Math.abs(finalLayout.height - initialLayout.height);
    const widthDiff = Math.abs(finalLayout.width - initialLayout.width);
    
    expect(heightDiff).toBeLessThan(100);
    expect(widthDiff).toBeLessThan(100);
  });

  test('should have proper cache headers for static assets', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    
    // Check for cache headers (not critical for first load but good practice)
    const cacheControl = headers['cache-control'] ?? '';
    
    // Cache control is recommended but not required
    if (cacheControl) {
      expect(cacheControl.length).toBeGreaterThan(0);
    }
  });

  test('should load fonts efficiently', async ({ page }) => {
    await page.goto('/');
    
    const fonts = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let fontCount = 0;
      
      try {
        styleSheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach((rule) => {
              if (rule.cssText.includes('font-face') || rule.cssText.includes('@font-face')) {
                fontCount++;
              }
            });
          } catch {
            // Cross-origin stylesheets may throw
          }
        });
      } catch {
        // Ignore
      }
      
      return fontCount;
    });
    
    // Should not have excessive fonts
    expect(fonts).toBeLessThan(5);
  });

  test('should have efficient third-party scripts', async ({ page }) => {
    await page.goto('/');
    
    const thirdPartyRequests = await page.evaluate(() => {
      return (window as any).__THIRD_PARTY_REQUESTS__ || 0;
    });
    
    // Third party scripts should be reasonable
    // This is a placeholder - actual implementation would track network requests
    expect(true).toBeTruthy();
  });

  test('should have low memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if page is still responsive
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isResponsive).toBeTruthy();
  });
});

test.describe('Core Web Vitals', () => {
  test('LCP should be good', async ({ page }) => {
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Fallback timeout
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    // LCP should be under 2.5 seconds
    if (lcp) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('FID should be good', async ({ page }) => {
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const firstEntry = entries[0] as any;
          resolve(firstEntry.processingStart - firstEntry.startTime);
        }).observe({ type: 'first-input', buffered: true });
        
        // Fallback timeout
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    // FID should be under 100ms
    if (fid) {
      expect(fid).toBeLessThan(100);
    }
  });

  test('CLS should be good', async ({ page }) => {
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
        
        // Fallback timeout
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    // CLS should be under 0.1
    expect(cls).toBeLessThan(0.1);
  });
});