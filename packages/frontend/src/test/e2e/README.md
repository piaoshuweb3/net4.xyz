# Frontend Testing Suite

This directory contains the E2E, accessibility, and performance tests for the net4.xyz frontend.

## Test Structure

- `app.spec.ts` - Main E2E tests for the application
- `a11y.spec.ts` - Accessibility tests using axe-core
- `perf.spec.ts` - Performance tests
- `cross-browser.spec.ts` - Cross-browser compatibility tests

## Running Tests

### Install Playwright Browsers
```bash
npx playwright install
```

### Run All E2E Tests
```bash
pnpm run test:e2e
```

### Run E2E Tests with UI
```bash
pnpm run test:e2e:ui
```

### Run Headed Tests (visible browser)
```bash
pnpm run test:e2e:headed
```

### Run Accessibility Tests Only
```bash
pnpm run test:a11y
```

### Run Performance Tests Only
```bash
pnpm run test:perf
```

### Run All Tests (unit + E2E)
```bash
pnpm run test:all
```

### Run Lighthouse Audit
```bash
pnpm run test:lighthouse
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts` and includes:
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device testing (Pixel 5, iPhone 12)
- Accessibility project
- Performance project
- HTML report generation

## Requirements

- Requirements 3.1: Frontend Testing
  - E2E tests ✓
  - Cross-browser testing ✓
  - Accessibility testing ✓
  - Performance testing ✓