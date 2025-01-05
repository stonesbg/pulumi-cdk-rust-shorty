import * as pulumicdk from '@pulumi/cdk';
import { RemovalPolicy, Duration } from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';

export class UrlShortenerStack extends pulumicdk.Stack {
  constructor(scope: pulumicdk.App, id: string, props?: pulumicdk.StackOptions) {
    super(scope, id, props);

    // DynamoDB table to store URL mappings
    const urlTable = new dynamodb.Table(this, 'UrlTable', {
      partitionKey: { name: 'short_url', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const createShortUrlAsset = new Asset(this, 'CreateShortUrlAsset', {
      path: path.join(__dirname, '../../rust/create-url/target/lambda/create-url/bootstrap.zip'),
    });

    // Lambda function for creating short URLs
    const createUrlFunction = new lambda.Function(this, 'CreateShortUrl', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromBucket(createShortUrlAsset.bucket, createShortUrlAsset.s3ObjectKey),
      environment: {
        TABLE_NAME: urlTable.tableName,
      },
    });

    const lambdaAsset = new Asset(this, 'RedirectUrlAsset', {
      path: path.join(__dirname, '../../rust/redirect-url/target/lambda/redirect-url/bootstrap.zip'),
    });

    // Lambda function for redirecting short URLs
    const redirectFunction = new lambda.Function(this, 'RedirectUrl', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromBucket(lambdaAsset.bucket, lambdaAsset.s3ObjectKey),
      environment: {
        TABLE_NAME: urlTable.tableName,
      },
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.seconds(30),
    });

    // Grant Lambda functions access to DynamoDB
    urlTable.grantWriteData(createUrlFunction);
    urlTable.grantReadData(redirectFunction);

    const prdLogGroup = new logs.LogGroup(this, "PrdLogs");
    // Create API Gateway
    const api = new apigateway.RestApi(this, 'UrlShortenerApi', {
      restApiName: 'URL Shortener API',
      description: 'API for URL shortening service',
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(prdLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });
    //const deployment = new apigateway.Deployment(this, 'Deployment', { api });

    // API endpoints
    const urls = api.root.addResource('urls');

    const urlModel = api.addModel('UrlModel', {
      contentType: 'application/json',
      modelName: 'UrlModel',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['url'],
        properties: {
          url: { type: apigateway.JsonSchemaType.STRING }
        }
      }
    });

    urls.addMethod('POST', new apigateway.LambdaIntegration(createUrlFunction), {
      requestModels: {
        'application/json': urlModel
      },
    });

    const shortUrl = api.root.addResource('{shortUrl}');
    shortUrl.addMethod('GET', new apigateway.LambdaIntegration(redirectFunction));
  }
}