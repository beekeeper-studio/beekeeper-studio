Connect to azure EntraId is relatively simple once you are aware of how authentication works in azure.

## EntraId Configuration

To begin you might need az CLI installed which you can find instructions on how to do this here: [AZ CLI Instructions](https://learn.microsoft.com/en-us/cli/azure/)

AZ ClI is only required for CLI based authentication.

### CLI Authentication

To authenticate with Azure using the AZ CLI, first login to az cli with ```az login```

Once done, select Azure CLI Authentication from the Authentication method, this will work with MySQL, MS SQL and Postgresql

You will just need to set the server, database and user field. Our application will then use your local AZ CLI to get an access token and log you in.


### Azure AD SSO (Only for MS SQL)

Azure AD SSO is a simpler authentication method, you just need to provide the server and database and click connect. This will load up a browser where you can log in
with your Microsoft Entra credentials.

### Azure Service Principal Secret (Only for MS SQL)

Azure Service Principal requires you to configure a service principal in azure, once configured you need to give this service principal permissions to access the DB.

Once done, simply enter the server, database, tenant ID and Client Secret of the service principal, and it will use that to authenticate with the DB.
