# website-integration-tests

Repository holds sample integration tests for website using playwright for visiting site and lighthouse for Web Vitals

In order to run them simply use, when inside correct directory:

```
node .\playwright-tests\test-recaptcha.js
node .\lighthouse-tests\lighthouse-test.mjs
```

In order to run recaptcha tests for other site than default, we can use

```
node .\test-recaptcha.js https://about-intrinsic-nextjs.vercel.app/en/contact-info
```
