# URL Shortener

A serverless URL shortener built with AWS CDK (TypeScript) and Rust Lambda functions.

## Architecture

- AWS CDK for infrastructure as code
- DynamoDB for storing URL mappings
- Lambda functions written in Rust
- API Gateway for HTTP endpoints

## Project Structure

```
.
├── cdk-app/           # CDK application (TypeScript)
│   ├── bin/          # CDK app entry point
│   └── lib/          # Stack definition
└── rust/             # Rust Lambda functions
    ├── create-url/   # Function to create short URLs
    └── redirect-url/ # Function to redirect short URLs
```

## Setup

1. Install dependencies:
   ```bash
   cd cdk-app
   npm install
   ```

2. Build Rust functions:
   ```bash
   cd rust/create-url
   cargo build --release
   cd ../redirect-url
   cargo build --release
   ```

3. Deploy:
   ```bash
   cd ../../cdk-app
   cdk deploy
   ```

## Usage

1. Create a short URL:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
        -d '{"url":"https://example.com"}' \
        https://your-api-gateway-url/prod/urls
   ```

2. Access shortened URL:
   ```
   https://your-api-gateway-url/prod/{shortUrl}
   ```