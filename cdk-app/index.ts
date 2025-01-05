#!/usr/bin/env node
import 'source-map-support/register';
import * as pulumicdk from '@pulumi/cdk';
import { Tags } from 'aws-cdk-lib/core';
import { UrlShortenerStack } from './lib/url-shortener-stack';

const app = new pulumicdk.App('app', (scope: pulumicdk.App) => {
  const url_stack = new UrlShortenerStack(app, 'UrlShortenerStack', {
  });

  Tags.of(url_stack).add('wfx_deploy_by', 'pulumi');
  Tags.of(url_stack).add('wfx_owned_by', 'platform');
});

