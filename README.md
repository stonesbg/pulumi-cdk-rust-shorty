# URL Shortener

A serverless URL shortener built with AWS CDK (TypeScript) and Rust Lambda functions initially and then converted to pulumi-cdk afterwards.  This is just a practice project to see how the pulumi-cdk works

## Architecture

- AWS CDK for infrastructure as code / pulumi-cdk
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
   cargo lambda build --release --output-format zip
   cd ../redirect-url
   cargo lambda build --release --output-format zip
   ```

3. Deploy:
   1. Cdk flavor
   ```bash
   cd ../../cdk-app
   cdk deploy
   ```
   2. Pulumi flavor
   ```
   cd ../../cdk-app
   pulumi up
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