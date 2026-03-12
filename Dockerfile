FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Copy test file
COPY crawler-tests/test-recaptcha-playwright.js ./

# Install only what's needed
RUN npm init -y && npm install playwright

# Results will be mounted as volume
RUN mkdir -p ./test-results

# Keep container running to allow inspection of results
CMD ["sh", "-c", "node test-recaptcha-playwright.js ; tail -f /dev/null"]