import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SsmEc2 from '../lib/ssm-ec2-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SsmEc2.SsmEc2Stack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
