const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const url =
    process.argv[2] ??
    'https://intrinsic-michal-turczyn.turek1992.workers.dev/en/contact-info'
console.log(`Running checks for ${url}`)

// Configuration
const TEST_RESULTS_DIR = './test-results/playwright' // Change this to your desired directory

if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true })
    console.log(`📁 Created report directory: ${TEST_RESULTS_DIR}\n`)
}

;(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: [
            // Expose automation
            '--enable-automation',
            '--disable-blink-features=AutomationControlled',
            // No sandbox - typical in containers/bots
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // Disable GPU - typical headless signal
            '--disable-gpu',
            '--disable-software-rasterizer',
            // Suspicious network behavior
            '--disable-background-networking',
            '--disable-default-apps',
            '--no-first-run',
            // Disable JS JIT - unusual for real browser
            '--js-flags=--jitless',
            // No images loaded
            '--blink-settings=imagesEnabled=false',
        ],
    })

    const context = await browser.newContext({
        // userAgent:
        //     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome Safari/537.36',
        // viewport: { width: 1200, height: 800 },
        // // Critical: Clear all storage between runs
        // storageState: undefined,
        // // Disable cache
        // cacheControl: 'no-cache',

        // Very old/suspicious user agent
        userAgent: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
        viewport: { width: 800, height: 600 },
        // No locale - bots often don't set this
        locale: undefined,
        // No timezone
        timezoneId: undefined,
        // No permissions
        permissions: [],
        // Disable JS (most aggressive - may break page but very bot-like)
        // javaScriptEnabled: false,
    })

    // Clear all cookies explicitly
    await context.clearCookies()

    // Inject suspicious/malformed Google cookies
    await context.addCookies([
        { name: 'NID', value: 'AAAA', domain: '.google.com', path: '/' },
        { name: 'CONSENT', value: 'PENDING', domain: '.google.com', path: '/' },
        // Malformed session cookies
        {
            name: 'HSID',
            value: 'AAAAAAAAAAAAAAAA',
            domain: '.google.com',
            path: '/',
        },
        {
            name: 'SSID',
            value: 'AAAAAAAAAAAAAAAA',
            domain: '.google.com',
            path: '/',
        },
    ])

    // Override browser fingerprint to look automated
    await context.addInitScript(() => {
        // Expose webdriver flag
        Object.defineProperty(navigator, 'webdriver', { get: () => true })
        // No plugins - real browsers have some
        Object.defineProperty(navigator, 'plugins', { get: () => [] })
        // No languages
        Object.defineProperty(navigator, 'languages', { get: () => [] })
        // Fake hardware concurrency (bots often have 1)
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 1,
        })
        // No device memory
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 0 })
        // Headless chrome signal
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Linux x86_64',
        })
        // No touch support - but claim to be mobile (inconsistent = suspicious)
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
    })

    const page = await context.newPage()

    // Set extra HTTP headers to prevent caching
    await page.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
    })

    console.log('Visiting website...')

    await page.goto(url, {
        waitUntil: 'networkidle',
    })

    console.log('Page loaded. Waiting for reCAPTCHA to fire...')

    // console.log('Page loaded. Submitting form instantly...')

    // // Fill form fields immediately (no typing delay)
    // await page.fill('input[name="name"]', 'Bot Tester')
    // await page.fill('input[name="email"]', 'bot@test.com')
    // await page.fill('textarea[name="message"]', 'Automated captcha test')

    // // Submit immediately
    // await Promise.all([
    //     page.waitForLoadState('networkidle'),
    //     page.click('button[type="submit"]'),
    // ])

    // console.log('Form submitted.')

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

    await browser.close()
})()
