const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const url = process.argv[2] ?? 'https://intrinsic-michal-turczyn.turek1992.workers.dev/en/contact-info'
console.log(`Running checks for ${url}`)

// Configuration
const TEST_RESULTS_DIR = './test-results' // Change this to your desired directory

if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true })
    console.log(`📁 Created report directory: ${TEST_RESULTS_DIR}\n`)
}

;(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-background-networking', // Prevent background requests
            '--disable-default-apps',
            '--no-first-run',
        ],
    })

    const context = await browser.newContext({
        userAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome Safari/537.36',
        viewport: { width: 1200, height: 800 },
        // Critical: Clear all storage between runs
        storageState: undefined,
        // Disable cache
        cacheControl: 'no-cache',
    })

    // Clear all cookies explicitly
    await context.clearCookies()

    const page = await context.newPage()

    // Set extra HTTP headers to prevent caching
    // await page.setExtraHTTPHeaders({
    //     'Cache-Control': 'no-cache, no-store, must-revalidate',
    //     Pragma: 'no-cache',
    //     Expires: '0',
    // })

    console.log('Visiting website...')

    await page.goto(url, {
        waitUntil: 'networkidle',
    })

    console.log('Page loaded. Waiting for reCAPTCHA to fire...')

    await page.waitForTimeout(3000)

    page.on('console', (msg) => console.log('Browser log:', msg.text()))

    console.log('Done. Close browser manually if you want to inspect.')

    // Get the full HTML content
    const html = await page.content()

    // console.log('Full HTML:', html)
    const filePath = path.join(TEST_RESULTS_DIR, 'bot-test-result.html')
    fs.writeFileSync(filePath, html)

    console.log(`✅ HTML captured from headless mode`)
    console.log(`📁 Saved to: ${filePath}`)
    console.log(`🌐 Open this file in your browser to view the result`)

    // await browser.close();
})()
