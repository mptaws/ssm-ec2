import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

import { Fn, Tag, Resource, Tags } from '@aws-cdk/core';
import { AmazonLinuxImage, UserData } from '@aws-cdk/aws-ec2';
import { Role, ServicePrincipal, ManagedPolicy, CfnInstanceProfile } from '@aws-cdk/aws-iam'

class Ec2InstanceProps {
  readonly image : ec2.IMachineImage;
  readonly instanceType : ec2.InstanceType;
  readonly userData : UserData;
  readonly subnet : ec2.ISubnet;
  readonly role : Role;
}

class Ec2 extends Resource {
  constructor(scope: cdk.Construct, id: string, props? : Ec2InstanceProps) {
    super(scope, id);

    if (props) {

      //create a profile to attch the role to the instance
      const profile = new CfnInstanceProfile(this, `${id}Profile`, {
        roles: [ props.role.roleName ]
      });

      // create the instance
      const instance = new ec2.CfnInstance(this, id, {
        imageId: props.image.getImage(this).imageId,
        instanceType: props.instanceType.toString(),
        networkInterfaces: [
          {
            deviceIndex: "0",
            subnetId: props.subnet.subnetId
          }
        ]
        ,userData: Fn.base64(props.userData.render())
        ,iamInstanceProfile: profile.ref
      });

      // tag the instance
      Tags.of(instance).add('Name', `${SsmEc2Stack.name}/${id}`);
      }
  }
}

export class SsmEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'TestVPC', {
      maxAzs : 2
    });
    const privateSubnet0 = vpc.privateSubnets[0];

    // define the IAM role that will allow the EC2 instance to communicate with SSM
    const role = new Role(this, 'TestRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com')
    });

    // arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));


    // define a user data script to install & launch our web server
    const ssmaUserData = UserData.forLinux();
    // make sure the latest SSM Agent is installed.
    const SSM_AGENT_RPM='https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm';
    ssmaUserData.addCommands(`sudo yum install -y ${SSM_AGENT_RPM}`, 'restart amazon-ssm-agent');
    // install and start Nginx
    ssmaUserData.addCommands('yum install -y nginx', 'chkconfig nginx on', 'service nginx start');

    // launch an EC2 instance in the private subnet
    const instance = new Ec2(this, 'TestInstance', {
      image: new AmazonLinuxImage(),
      instanceType : ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      subnet : privateSubnet0,
      role: role,
      userData : ssmaUserData
    })

    //Add and attach an ALB to test nginx
    

  }
}
