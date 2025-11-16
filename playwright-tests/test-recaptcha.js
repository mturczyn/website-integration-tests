const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,                 // Headless (bot-like)
    args: ["--disable-blink-features=AutomationControlled"]
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome Safari/537.36",
    viewport: { width: 1200, height: 800 }
  });

  const page = await context.newPage();

  console.log("Visiting localhost...");

  let url = "https://intrinsic-michal-turczyn.turek1992.workers.dev/contact-info"
  // let url = "http://localhost:3000/contact-info"
  
  await page.goto(url, {
    waitUntil: "networkidle"
  });

  console.log("Page loaded. Waiting for reCAPTCHA to fire...");

  // Wait for client-side request to reCAPTCHA verify endpoint (optional)
  await page.waitForTimeout(3000);

  // Grab any score printed to the console or DOM
  page.on("console", msg => console.log("Browser log:", msg.text()));

  console.log("Done. Close browser manually if you want to inspect.");
  // await browser.close();
})();
