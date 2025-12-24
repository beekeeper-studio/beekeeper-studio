---
title: Amazon Redshift
summary: How to connect to Amazon Redshift using username/password, IAM credentials, or AWS SSO/Identity Center
icon: simple/amazonredshift
---

Beekeeper Studio supports three authentication methods for Amazon Redshift:

1. **Username/Password** - Traditional database credentials
2. **IAM Authentication** - Using AWS access keys or credentials file
3. **AWS SSO / Identity Center** - Browser-based single sign-on

## Authentication Methods

### Username/Password

The simplest method - just enter your Redshift database username and password directly.

1. Select **Username / Password** from the Authentication Method dropdown
2. Enter your Redshift cluster endpoint as the **Host**
3. Enter the **Port** (default: 5439)
4. Enter your **Username** and **Password**
5. Enter the **Default Database** name

### IAM Authentication

IAM authentication uses temporary credentials generated from your AWS IAM credentials. This is more secure than storing database passwords.

#### Prerequisites

1. Enable IAM database authentication on your Redshift cluster
2. Create an IAM user or role with the `redshift:GetClusterCredentials` permission
3. Configure your AWS credentials locally

#### Using Access Key and Secret Key

1. Select **IAM Authentication Using Access Key and Secret Key**
2. Enter your cluster **Host** and **Port**
3. Enter the **Username** (the database user to connect as)
4. In the IAM Authentication section:
   - Enter your **Access Key ID**
   - Enter your **Secret Access Key**
   - Enter the **AWS Region** (e.g., `us-east-1`)
   - Enter the **Cluster Identifier** (found in your Redshift console)
5. Optionally configure:
   - **Database Group** - IAM group for database permissions
   - **Token Duration** - How long credentials are valid (in seconds)

#### Using Credentials File

1. Select **IAM Authentication Using Credentials File**
2. Enter your cluster **Host** and **Port**
3. Enter the **Username**
4. In the IAM Authentication section:
   - Enter your **AWS Profile** name (from `~/.aws/credentials`)
   - Enter the **AWS Region**
   - Enter the **Cluster Identifier**

Your `~/.aws/credentials` file should look like:

```ini
[my-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### AWS SSO / Identity Center

AWS SSO provides browser-based authentication through your organization's identity provider. This is the recommended method for enterprise environments.

#### Prerequisites

1. AWS IAM Identity Center configured for your organization
2. An SSO-enabled AWS account with Redshift access
3. An IAM role with `redshift:GetClusterCredentials` permission

#### Connecting with AWS SSO

1. Select **AWS SSO / Identity Center** from the Authentication Method dropdown
2. Enter your cluster **Host** and **Port**
3. Enter the **Username** (database user)
4. Configure SSO settings:

**Option A: Using an SSO Profile**

If you have SSO profiles configured in `~/.aws/config`:

1. Select your profile from the **SSO Profile** dropdown
2. The SSO Start URL and Region will be filled automatically
3. Enter the **AWS Account ID** (12-digit account number)
4. Enter the **IAM Role Name** to assume

**Option B: Manual Configuration**

1. Select **Custom (enter manually)** from the SSO Profile dropdown
2. Enter your **SSO Start URL** (e.g., `https://mycompany.awsapps.com/start`)
3. Enter the **SSO Region** (where Identity Center is configured)
4. Enter the **AWS Account ID**
5. Enter the **IAM Role Name**

5. Configure Redshift-specific settings:
   - **AWS Region** - Where your Redshift cluster is located
   - **Cluster Identifier** or **Workgroup Name** (for Serverless)
   - Toggle **Is Serverless Instance** if using Redshift Serverless

6. Click **Connect**
7. A browser window will open for authentication
8. Sign in with your corporate credentials
9. Return to Beekeeper Studio - connection will complete automatically

#### SSO Profile Configuration

You can pre-configure SSO profiles in `~/.aws/config`:

**Legacy format:**
```ini
[profile my-redshift-profile]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = RedshiftReadOnly
region = us-east-1
```

**New SSO session format:**
```ini
[sso-session my-sso]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1

[profile my-redshift-profile]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = RedshiftReadOnly
region = us-east-1
```

## Redshift Serverless

For Redshift Serverless workgroups:

1. Toggle **Is Serverless Instance** to ON
2. Enter your **Workgroup Name** in the Cluster Identifier field
3. The host will be your Serverless endpoint (e.g., `workgroup-name.123456789012.us-east-1.redshift-serverless.amazonaws.com`)

## Required IAM Permissions

### For Standard Redshift Clusters

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "redshift:GetClusterCredentials",
                "redshift:DescribeClusters"
            ],
            "Resource": [
                "arn:aws:redshift:REGION:ACCOUNT_ID:cluster:CLUSTER_NAME",
                "arn:aws:redshift:REGION:ACCOUNT_ID:dbuser:CLUSTER_NAME/*",
                "arn:aws:redshift:REGION:ACCOUNT_ID:dbname:CLUSTER_NAME/*"
            ]
        }
    ]
}
```

### For Redshift Serverless

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "redshift-serverless:GetCredentials",
                "redshift-serverless:GetWorkgroup"
            ],
            "Resource": [
                "arn:aws:redshift-serverless:REGION:ACCOUNT_ID:workgroup/WORKGROUP_ID"
            ]
        }
    ]
}
```

## SSL Configuration

SSL is automatically enabled when using IAM or SSO authentication. For username/password connections, you can enable SSL in the **Advanced** settings section.

## Troubleshooting

### "Access Denied" errors

- Verify your IAM user/role has the required permissions
- Check that the database user exists in Redshift
- Ensure the cluster allows IAM authentication

### SSO authentication times out

- Check that your SSO Start URL is correct
- Verify your Identity Center session hasn't expired
- Try refreshing your SSO profiles

### Connection refused

- Verify the cluster endpoint and port are correct
- Check that your security group allows inbound traffic on port 5439
- Ensure the cluster is publicly accessible or you're connecting via VPN/SSH tunnel

## Useful Links

- [AWS Redshift IAM Authentication](https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html)
- [AWS IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [Redshift Serverless](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-whatis.html)
- [AWS CLI SSO Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
