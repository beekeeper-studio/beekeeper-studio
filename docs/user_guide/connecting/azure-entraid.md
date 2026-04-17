---
title: Azure EntraID Support
summary: Connect to databases hosted in Azure using SSO via EntraID
icon: material/cloud

---
# Connecting to Databases in Azure using Entra ID

Connecting to a database in Azure using Entra ID is straightforward once you're familiar with Azure's authentication methods. This guide outlines the three most common methods to connect to databases such as **MySQL**, **PostgreSQL**, and **MS SQL** via Entra ID.


## Authentication Methods

We support 3 methods for connecting to databases using EntraID:
1. Browser based SSO authentication (easiest)
2. Azure CLI based SSO authentication (recommended)
3. Service Principal authentication

If you've used any of these tools you'll likely be familiar with the workflows, nevertheless a walkthrough of each of these methods can be seen below.

We recommend using the Azure CLI authentication whenever possible.

## Browser-based authentication

!!! info "MS SQL Server Supported"

Uses your Microsoft EntraID credentials via a browser for a streamlined sign-in experience.

<video controls>
    <source id="workspaces" type="video/mp4" src="https://assets.beekeeperstudio.io/bks-azure-entra-sso.mp4" />
</video>
<small>Video walkthrough</small>

!!! warning "Passes through the BKS webserver"
    Signing in to your database this way does require authentication through the Beekeeper Studio web server which will temporarily store a token for the app to use. No credentials are stored by the webserver.

### Steps

1. Select a database to connect to
1. Select **Azure AD SSO** as the authentication method.
1. Enter:
    - **Server**
    - **Database**
1. Click **Connect**.
1. Your browser will launch and prompt you to authenticate
1. After authentication you'll be prompted to switch back to your application to complete the process.



## Azure CLI Authentication

!!! info "MySQL, PostgreSQL and MS SQL Server Supported"
    Installation of the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/) is required.

Sign into azure using the Azure CLI, then use your authenticated session to access your database in Azure.

This is the most enterprise-friendly workflow as it does not require the cooperation of the Beekeeper Studio servers, simply a pre-authenticated AZ client with the right permissions.

<video controls>
    <source id="workspaces" type="video/mp4" src="https://assets.beekeeperstudio.io/bks-azure-entra-cli.mp4" />
</video>
<small>Azure CLI authentication walkthrough video</small>

To start, make sure you have [installed the Azure CLI From Microsoft](https://learn.microsoft.com/en-us/cli/azure/?view=azure-cli-latest), and know how to use `az login` to sign into your Azure account.

If you're part of a large enterprise, they likely have documentation on how to do this.

### Steps

1. Open your terminal and log in to Azure by typing `az login` and following the prompts
2. Open Beekeeper Studio and select/enter the database credentials you wish to connect to
3. Select **Azure CLI Authentication** as the authentication method.
3. Provide:
    - **Server**
    - **Database**
    - **Username**
    - Note: No password required!
1. Click 'connect'. This takes a few moments as Beekeeper Studio asks for the temporary access key


## Service Principal Authentication

!!! info "MS SQL Server Supported"

Service principals are best suited for automated services or non-interactive applications, but we support them in Beekeeper Studio in case they are your only option.

We recommend using Azure CLI whenever possible.


<video controls>
    <source id="workspaces" type="video/mp4" src="https://assets.beekeeperstudio.io/bks-azure-entra-principal.mp4" />
</video>
<small>Service Principal authentication walkthrough</small>


### Steps

1. [Create a Service Principal](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal) in Azure.
2. Grant the Service Principal access to the database.
1. Open Beekeeper Studio and select the database you wish to connect to.
3. Select **Service Principal** as the authentication method.
4. Provide:
    - **Server**
    - **Database**
    - **Tenant ID**
    - **Client ID**
    - **Client Secret**

!!! warning Beekeeper Studio **will** store your client ID and Secret in this authentication workflow.


## Troubleshooting

### Error: Login failed for user '<user>@<tenant>.onmicrosoft.com'

**Cause:**
This error occurs when the SSO-authenticated user is not mapped to a SQL database user.

**Solution:**

You need to explicitly create a user in SQL that maps to the Microsoft Entra identity.

📖 Reference: [Login failed for user - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user)

**Fix Example (run in SQL):**
```sql
CREATE USER [<user>@<tenant>.onmicrosoft.com] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<user>@<tenant>.onmicrosoft.com];
ALTER ROLE db_datawriter ADD MEMBER [<user>@<tenant>.onmicrosoft.com];
```

Ensure the user has necessary permissions within the target database.

---
