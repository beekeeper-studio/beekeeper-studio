---
title: Amazon RDS
summary: How to connect to Amazon RDS databases using username/password, IAM credentials, or AWS SSO/Identity Center
icon: simple/amazonrds
---

Beekeeper Studio supports three authentication methods for Amazon RDS (PostgreSQL and MySQL):

1. **Username/Password** - Traditional database credentials
2. **IAM Authentication** - Using AWS access keys or credentials file
3. **AWS SSO / Identity Center** - Browser-based single sign-on

## Prerequisites

Before connecting with IAM or SSO authentication:

1. Enable IAM database authentication on your RDS instance
2. Ensure your security group allows traffic from your IP address
3. Create an IAM user or role with the appropriate permissions

## Authentication Methods

### Username/Password

The simplest method - just enter your RDS database username and password directly.

1. Select **Username / Password** from the Authentication Method dropdown
2. Enter your RDS endpoint as the **Host**
3. Enter the **Port** (PostgreSQL: 5432, MySQL: 3306)
4. Enter your **Username** and **Password**
5. Enter the **Default Database** name

### IAM Authentication

IAM authentication uses temporary credentials generated from your AWS IAM credentials. This is more secure than storing database passwords.

#### IAM Configuration in Amazon

To configure IAM DB access, ensure the DB in AWS is configured to allow IAM authentication. This can be done by modifying the DB instance and enabling IAM DB authentication.

You will need to create an IAM user and attach a policy that allows the `rds-db:connect` action:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds-db:connect"
            ],
            "Resource": [
                "arn:aws:rds-db:REGION:ACCOUNT_ID:dbuser:DBI_RESOURCE_ID/DATABASE_USER"
            ]
        }
    ]
}
```

Replace:
- `REGION` with your AWS region (e.g., `us-east-1`)
- `ACCOUNT_ID` with your 12-digit AWS account ID
- `DBI_RESOURCE_ID` with your RDS instance's resource ID (found in the RDS console)
- `DATABASE_USER` with the database username

#### Using Access Key and Secret Key

1. Select **IAM Authentication Using Access Key and Secret Key**
2. Enter your RDS **Host** and **Port**
3. Enter the **Database** name and **Username**
4. In the IAM Authentication section:
   - Enter your **Access Key ID**
   - Enter your **Secret Access Key**
   - Enter the **AWS Region** (e.g., `us-east-1`)

#### Using Credentials File

1. Select **IAM Authentication Using Credentials File**
2. Enter your RDS **Host** and **Port**
3. Enter the **Database** name and **Username**
4. In the IAM Authentication section:
   - Enter your **AWS Profile** name (from `~/.aws/credentials`)
   - Enter the **AWS Region**

Your `~/.aws/credentials` file should look like:

```ini
[my-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### AWS SSO / Identity Center

AWS SSO provides browser-based authentication through your organization's identity provider. This is the recommended method for enterprise environments.

#### Prerequisites for SSO

1. AWS IAM Identity Center configured for your organization
2. An SSO-enabled AWS account with RDS access
3. An IAM role with `rds-db:connect` permission

#### Connecting with AWS SSO

1. Select **AWS SSO / Identity Center** from the Authentication Method dropdown
2. Enter your RDS **Host** and **Port**
3. Enter the **Database** name and **Username** (database user)
4. Configure SSO settings:

**Option A: Using an SSO Profile**

If you have SSO profiles configured in `~/.aws/config`:

1. Select your profile from the **SSO Profile** dropdown
2. The SSO Start URL and Region will be filled automatically
3. Enter the **AWS Account ID** (12-digit account number)
4. Enter the **IAM Role Name** to assume
5. Enter the **AWS Region** where your RDS instance is located

**Option B: Manual Configuration**

1. Select **Custom (enter manually)** from the SSO Profile dropdown
2. Enter your **SSO Start URL** (e.g., `https://mycompany.awsapps.com/start`)
3. Enter the **SSO Region** (where Identity Center is configured)
4. Enter the **AWS Account ID**
5. Enter the **IAM Role Name**
6. Enter the **AWS Region** where your RDS instance is located

5. Click **Connect**
6. A browser window will open for authentication
7. Sign in with your corporate credentials
8. Return to Beekeeper Studio - connection will complete automatically

#### SSO Profile Configuration

You can pre-configure SSO profiles in `~/.aws/config`:

**Legacy format:**
```ini
[profile my-rds-profile]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = RDSAccessRole
region = us-east-1
```

**New SSO session format:**
```ini
[sso-session my-sso]
sso_start_url = https://mycompany.awsapps.com/start
sso_region = us-east-1

[profile my-rds-profile]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = RDSAccessRole
region = us-east-1
```

## SSL Configuration

SSL is automatically enabled when using IAM or SSO authentication. For username/password connections, you can enable SSL in the **Advanced** settings section.

**Note:** SSL is required on most RDS instances, so ensure this is checked.

## Troubleshooting

### "Access Denied" errors

- Verify your IAM user/role has the `rds-db:connect` permission
- Check that the database user exists and is configured for IAM authentication
- Ensure the resource ARN in your policy matches your RDS instance

### SSO authentication times out

- Check that your SSO Start URL is correct
- Verify your Identity Center session hasn't expired
- Try refreshing your SSO profiles

### Connection refused

- Verify the RDS endpoint and port are correct
- Check that your security group allows inbound traffic
- Ensure the RDS instance is publicly accessible or you're connecting via VPN/SSH tunnel

### Token generation fails

- Ensure your AWS credentials are valid and not expired
- Check that the AWS region is correct
- Verify the database user is configured for IAM authentication in RDS

## Useful Links

- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [AWS IAM DB Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [AWS IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [AWS CLI SSO Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [AWS IAM Policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [AWS IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html)
- [AWS IAM Roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html)
