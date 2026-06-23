import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LighthouseResult {
  categories: {
    performance: { score: number };
    accessibility: { score: number };
    'best-practices': { score: number };
    seo: { score: number };
  };
  audits: {
    id: string;
    title: string;
    score: number | null;
    numericValue?: number;
  }[];
}

const URL = process.env.LH_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../lighthouse-report');

function runLighthouse(): LighthouseResult {
  console.log(`Running Lighthouse on ${URL}...`);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, 'lighthouse-report.json');
  
  try {
    execSync(
      `npx lighthouse ${URL} ` +
      `--output=json ` +
      `--output-path=${outputPath} ` +
      `--preset=desktop ` +
      `--quiet ` +
      `--chrome-flags="--headless" ` +
      `--only-categories=performance,accessibility,best-practices,seo`,
      { stdio: 'inherit' }
    );
    
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    return report;
  } catch (error) {
    console.error('Lighthouse execution failed:', error);
    throw error;
  }
}

function printResults(result: LighthouseResult): void {
  console.log('\n=== Lighthouse Results ===\n');
  
  // Print category scores
  console.log('Scores:');
  console.log(`  Performance:  ${Math.round((result.categories.performance.score || 0) * 100)}/100`);
  console.log(`  Accessibility: ${Math.round((result.categories.accessibility.score || 0) * 100)}/100`);
  console.log(`  Best Practices: ${Math.round((result.categories['best-practices'].score || 0) * 100)}/100`);
  console.log(`  SEO:           ${Math.round((result.categories.seo.score || 0) * 100)}/100`);
  
  // Print failed audits
  console.log('\nFailed Audits:');
  const failedAudits = result.audits.filter(
    (a) => a.score !== null && a.score < 1
  );
  
  if (failedAudits.length === 0) {
    console.log('  None!');
  } else {
    failedAudits.slice(0, 10).forEach((audit) => {
      console.log(`  - ${audit.title}`);
      if (audit.numericValue) {
        console.log(`    Value: ${audit.numericValue}`);
      }
    });
  }
  
  console.log('\n========================\n');
}

function checkThresholds(result: LighthouseResult): boolean {
  const thresholds = {
    performance: 0.9,
    accessibility: 0.9,
    'best-practices': 0.9,
    seo: 0.9,
  };
  
  let passed = true;
  
  for (const [category, threshold] of Object.entries(thresholds)) {
    const score = result.categories[category as keyof typeof result.categories]?.score || 0;
    if (score < threshold) {
      console.error(`❌ ${category} score (${Math.round(score * 100)}) is below threshold (${Math.round(threshold * 100)})`);
      passed = false;
    } else {
      console.log(`✅ ${category} score: ${Math.round(score * 100)}`);
    }
  }
  
  return passed;
}

// Main execution
try {
  const result = runLighthouse();
  printResults(result);
  const passed = checkThresholds(result);
  
  if (!passed) {
    console.error('Some thresholds were not met!');
    process.exit(1);
  }
  
  console.log('All thresholds passed!');
  process.exit(0);
} catch (error) {
  console.error('Lighthouse audit failed:', error);
  process.exit(1);
}