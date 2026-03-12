# website-integration-tests

Repository holds sample integration tests for website using playwright/puppeteer for visiting site and lighthouse for Web Vitals

In order to run them simply use, when inside correct directory:

```
node .\crawler-tests\test-recaptcha-playwright.js
node .\lighthouse-tests\lighthouse-test.mjs
```

In order to run recaptcha tests for other site than default, we can use

```
cd .\crawler-tests
node .\test-recaptcha-playwright.js https://about-intrinsic-nextjs.vercel.app/en/contact-info
```

# `npm run` commands

- `npm run puppeteerTest` - run test using puppeteer (first argument is website to vist, second is number of vists and third is max concurrent visits)
- `npm run puppeteerTestCloudflare -- 20 5` - run test using puppeteer against page hosted in Cloadflare (with arguments: 20 vists with max 5 concurrent vists)
- `npm run puppeteerTestCloudflare_100_10` - run test using puppeteer against page hosted in Cloadflare, 100 visits with max 10 concurrent vists
- `npm run puppeteerTestVercel` - run test using puppeteer against page hosted in Vercel
- `npm run puppeteerTestVercel_100_10` - run test using puppeteer against page hosted in Vercel, 100 visits with max 10 concurrent vists
- `npm run playwrightTest` - run test using playwright
- `npm run lighthouseTest` - run lighthouse tests

# Docker support

In order for crawlers appear more like bots, I decided to create containers with crawling script, that are deployed to cloud (as of time of writing it's Azure). Then cloud container instance crawls page.

## Results

First runs when the crawler just visited page, did not go well, as crawler got reCAPTCHA score good enough to access full data on page.

Next step is to make this script visit page multiple times, 5 or more (parametrized). 

After implementation, we could run load tests by specifying number of runs and concurrency level.

After running it with big enough amount of requests and concurency set to 10 (limit of concurrent requests), in some casese we could observe recaptcha check failures.

After all, Docker was an option, but as it turned out, load and concurrency are key factors to retrieve low reCAPTCHA scores. Keeping docker files and notes just for reference.

## Useful commands for cotainers (Docker & Azure)

Create container app from image stored in Docker Hub (turekturek user)

```
az container create `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test `
  --image turekturek/puppeteer-recaptcha-bot-test:latest  `
  --dns-name-label my-app-dns-2 `
  --ports 80 `
  --os-type Linux `
  --cpu 1 `
  --memory 1.5
```

Check status of container app

```
az container show `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test `
  --query instanceView.state
```

Get the public URL of container app

```
az container show `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test `
  --query ipAddress.fqdn `
  --output tsv
```

View live logs of container app

```
az container logs `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test
```

Execute command on container (this enters container's shell)

```
az container exec `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test `
  --exec-command "/bin/sh"
```

Delete existing container instance

```
az container delete `
  --resource-group intrinsic-rg `
  --name puppeteer-recaptcha-bot-test `
  --yes
```

## Process of creating image and pushing to Azure

1. Build docker with approriate tags
    ```
    docker build -t turekturek/puppeteer-recaptcha-bot-test:latest --file Dockerfile.puppeteer .
    ```

2. Push docker
    ```
    docker push turekturek/puppeteer-recaptcha-bot-test:latest
    ```

3. Recreate container app (delete and create) - Azure Container Instance is unable to pull latest image on its own

4. Execute `bin/sh` command with in Azure container in order to inspect files.  

