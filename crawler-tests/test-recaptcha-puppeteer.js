const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const url =
    process.argv[2] ??
    'https://intrinsic-michal-turczyn.turek1992.workers.dev/en/contact-info'
const RUNS = parseInt(process.argv[3] ?? '300')
const CONCURRENCY = parseInt(process.argv[4] ?? '3')

const randomDelay = (min, max) =>
    new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    )

const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-') // replace chars invalid in folder names
    .replace('T', '_')
    .slice(0, 19) // trim milliseconds

const TEST_RESULTS_DIR = `./test-results/puppeteer/${timestamp}`

if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true })
    console.log(`📁 Created report directory: ${TEST_RESULTS_DIR}\n`)
}

const runCrawl = async (runIndex, pageLoadWaitMs) => {
    console.log(`\n🤖 Run ${runIndex + 1}/${RUNS}`)

    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--enable-automation',
            '--disable-dev-shm-usage',
            '--incognito',
        ],
    })

    const page = await browser.newPage()

    // Expose webdriver flag
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => true })
    })

    try {
        console.log(`  → Opening page...`)
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

        await new Promise((resolve) => setTimeout(resolve, pageLoadWaitMs))

        // Wait until "Verifying reCAPTCHA" disappears, max 20s
        try {
            await page.waitForFunction(
                () => !document.body.innerText.includes('Verifying reCAPTCHA'),
                { timeout: 20000 }
            )
            console.log(`  → Run ${runIndex + 1}: reCAPTCHA verified`)
        } catch {
            console.log(
                `  → Run ${runIndex + 1}: ⚠️ reCAPTCHA verification timed out`
            )
        }

        const html = await page.content()
        // const screenshot = await page.screenshot({ fullPage: true })

        // Check what data was exposed
        const emailFound = html.includes('turek1992@')
        const phoneFound = /503\s*536\s*506/.test(html)
        const captchaInfoPresent = /captcha/i.test(html)
        const dataFetched = emailFound || phoneFound
        const dataBlockedByCaptcha = captchaInfoPresent && !dataFetched

        // Save per-run results
        fs.writeFileSync(
            path.join(TEST_RESULTS_DIR, `run-${runIndex + 1}-result.html`),
            html
        )
        // fs.writeFileSync(path.join(TEST_RESULTS_DIR, `run-${runIndex + 1}-result.png`), screenshot)

        return {
            run: runIndex + 1,
            dataFetched,
            emailFound,
            phoneFound,
            captchaInfoPresent,
            dataBlockedByCaptcha,
            error: null,
        }
    } catch (err) {
        console.error(`  → ❌ Error: ${err.message}`)
        return { run: runIndex + 1, url, error: err.message }
    } finally {
        await browser.close()
    }
}

// Run with controlled concurrency
const runWithConcurrency = async () => {
    const results = []
    const running = []

    for (let i = 0; i < RUNS; i++) {
        try {
            const promise = runCrawl(i, 10 * 1000).then((result) => {
                results.push(result)
                running.splice(running.indexOf(promise), 1)
            })

            running.push(promise)

            if (running.length >= CONCURRENCY) {
                await Promise.race(running) // wait for any one to finish before continuing
            }
        } catch (err) {
            console.error(`Error starting run ${i + 1}: ${err.message}`)
        }
    }

    await Promise.all(running) // wait for remaining
    return results
}

;(async () => {
    console.log(`🚀 Starting ${RUNS} runs against ${url}\n`)
    const results = await runWithConcurrency()

    // for (let i = 0; i < RUNS; i++) {
    //     const result = await runCrawl(i)
    //     results.push(result)

    //     // Short random delay between runs (bot-like rapid fire)
    //     if (i < RUNS - 1) await randomDelay(500, 2000)
    // }

    // Save summary JSON
    fs.writeFileSync(
        path.join(TEST_RESULTS_DIR, '.summary.json'),
        JSON.stringify({ runs: RUNS, url, results }, null, 2)
    )
    console.log(`\n💾 Full results saved to ${TEST_RESULTS_DIR}/.summary.json`)
})()
