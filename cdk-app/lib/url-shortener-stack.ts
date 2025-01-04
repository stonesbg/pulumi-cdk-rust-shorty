import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'path';

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table to store URL mappings
    const urlTable = new dynamodb.Table(this, 'UrlTable', {
      partitionKey: { name: 'short_url', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function for creating short URLs
    const createUrlFunction = new lambda.Function(this, 'CreateShortUrl', {
      runtime: lambda.Runtime.PROVIDED_AL2,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../rust/create-url/target/lambda/create-url/bootstrap.zip')),
      environment: {
        TABLE_NAME: urlTable.tableName,
      },
    });

    // Lambda function for redirecting short URLs
    const redirectFunction = new lambda.Function(this, 'RedirectUrl', {
      runtime: lambda.Runtime.PROVIDED_AL2,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../rust/redirect-url/target/lambda/redirect-url/bootstrap.zip')),
      environment: {
        TABLE_NAME: urlTable.tableName,
      },
    });

    // Grant Lambda functions access to DynamoDB
    urlTable.grantWriteData(createUrlFunction);
    urlTable.grantReadData(redirectFunction);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'UrlShortenerApi', {
      restApiName: 'URL Shortener API',
    });

    // API endpoints
    const urls = api.root.addResource('urls');
    urls.addMethod('POST', new apigateway.LambdaIntegration(createUrlFunction));

    const shortUrl = api.root.addResource('{shortUrl}');
    shortUrl.addMethod('GET', new apigateway.LambdaIntegration(redirectFunction));
  }
}