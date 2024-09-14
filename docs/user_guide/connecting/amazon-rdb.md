Connecting to Amazon RDB requires you to set up an IAM user and ensure your security group allows traffic from your IP address.

## IAM Configuration in Amazon

To configure IAM DB access, ensure the DB in AWS is configured to allow IAM authentication. This can be done by modifying the DB instance and enabling IAM DB authentication.
You will then need to create an IAM user and attach the `AmazonRDSFullAccess` policy to the user. This policy allows the user to connect to the RDS instance.

You can also you a similar policy to the below:

``
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds-db:connect"
            ],
            "Resource": [
                "arn:aws:rds:eu-north-1:USERID:db:DB_NAME/USERNAME"
            ]
        }
    ]
}
``

## Connecting to Amazon RDS

Below is an example config in Beekeeper Studio once IAM permissions are setup, you will need the hostname, port, username, AWS Region and if you have multiple Amazon profiles you can specify the profile you want to use.

![Image Alt Tag](../../assets/images/amazon-rds-config.png)
