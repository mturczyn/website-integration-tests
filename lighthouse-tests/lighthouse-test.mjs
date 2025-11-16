// lighthouse-test.mjs
// Run with: node lighthouse-test.mjs

import fs from 'fs';
import path from 'path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

// Configuration
const REPORT_DIR = './lighthouse-reports'; // Change this to your desired directory

// Thresholds for tests
const THRESHOLDS = {
  performance: 70,
  accessibility: 80,
  bestPractices: 80,
  seo: 80,
  fcp: 2000, // ms
  lcp: 2500, // ms
  tbt: 300, // ms
  cls: 0.1
};

async function runLighthouse() {
  const url = 'https://intrinsic-michal-turczyn.turek1992.workers.dev/';
  let chrome;
  
  try {
    console.log('🚀 Starting Lighthouse tests...\n');
    
    // Create report directory if it doesn't exist
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
      console.log(`📁 Created report directory: ${REPORT_DIR}\n`);
    }
    
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-setuid-sandbox',
        '--disable-extensions'
      ]
    });
    
    // Run Lighthouse
    const options = {
      logLevel: 'error', // Changed from 'info' to reduce noise
      output: ['html', 'json'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      disableStorageReset: false,
      maxWaitForLoad: 45000,
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      }
    };
    
    const runnerResult = await lighthouse(url, options);
    
    // Generate timestamp for unique filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const htmlPath = path.join(REPORT_DIR, `lhreport-${timestamp}.html`);
    const jsonPath = path.join(REPORT_DIR, `lhreport-${timestamp}.json`);
    
    // Save reports
    fs.writeFileSync(htmlPath, runnerResult.report[0]);
    fs.writeFileSync(jsonPath, runnerResult.report[1]);
    console.log(`✅ Reports saved:\n   - ${htmlPath}\n   - ${jsonPath}\n`);
    
    // Run tests
    const lhr = runnerResult.lhr;
    console.log(`📊 Testing URL: ${lhr.finalDisplayedUrl}\n`);
    
    let passed = 0;
    let failed = 0;
    
    // Test categories
    const perfScore = lhr.categories.performance.score * 100;
    passed += checkTest('Performance', perfScore, THRESHOLDS.performance, '>=');
    
    const a11yScore = lhr.categories.accessibility.score * 100;
    passed += checkTest('Accessibility', a11yScore, THRESHOLDS.accessibility, '>=');
    
    const bpScore = lhr.categories['best-practices'].score * 100;
    passed += checkTest('Best Practices', bpScore, THRESHOLDS.bestPractices, '>=');
    
    const seoScore = lhr.categories.seo.score * 100;
    passed += checkTest('SEO', seoScore, THRESHOLDS.seo, '>=');
    
    // Test Core Web Vitals
    console.log('\n📈 Core Web Vitals:');
    const fcp = lhr.audits['first-contentful-paint'].numericValue;
    passed += checkTest('First Contentful Paint (FCP)', fcp, THRESHOLDS.fcp, '<=', 'ms');
    
    const lcp = lhr.audits['largest-contentful-paint'].numericValue;
    passed += checkTest('Largest Contentful Paint (LCP)', lcp, THRESHOLDS.lcp, '<=', 'ms');
    
    const tbt = lhr.audits['total-blocking-time'].numericValue;
    passed += checkTest('Total Blocking Time (TBT)', tbt, THRESHOLDS.tbt, '<=', 'ms');
    
    const cls = lhr.audits['cumulative-layout-shift'].numericValue;
    passed += checkTest('Cumulative Layout Shift (CLS)', cls, THRESHOLDS.cls, '<=');
    
    // Test specific audits
    console.log('\n🔍 Specific Audits:');
    const metaDesc = lhr.audits['meta-description'].score;
    passed += checkTest('Meta Description', metaDesc, 1, '==');
    
    const imgAlt = lhr.audits['image-alt'].score;
    passed += checkTest('Image Alt Attributes', imgAlt, 1, '==');
    
    // Summary
    failed = 10 - passed;
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Passed: ${passed}/10`);
    console.log(`❌ Failed: ${failed}/10`);
    console.log('='.repeat(50));
    
    // Exit with appropriate code
    if (failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error running Lighthouse:', error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

function checkTest(name, actual, threshold, operator, unit = '') {
  const unitStr = unit ? ` ${unit}` : '';
  let passed = false;
  
  switch (operator) {
    case '>=':
      passed = actual >= threshold;
      break;
    case '<=':
      passed = actual <= threshold;
      break;
    case '==':
      passed = actual === threshold;
      break;
  }
  
  const status = passed ? '✅' : '❌';
  const actualFormatted = unit === 'ms' ? Math.round(actual) : actual.toFixed(2);
  console.log(`${status} ${name}: ${actualFormatted}${unitStr} (threshold: ${operator} ${threshold}${unitStr})`);
  
  return passed ? 1 : 0;
}

// Run the tests
runLighthouse();