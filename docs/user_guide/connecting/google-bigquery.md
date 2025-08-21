---
title: Google Big Query
summary: "How to connect to Google Big Query from Beekeeper Studio, run queries, modify tables, and more!"
old_url: "https://docs.beekeeperstudio.io/docs/google-bigquery"
icon: simple/googlebigquery
---


Connecting to Google BigQuery requires you to set up an IAM user (either a 'user' or a 'service account', it doesn't matter) and download the private key json file for that user.

## Minimum Required IAM role

**BigQuery User**

(or BigQuery Data Viewer + BigQuery Job User)

At a minimum users need to have the `BigQuery User` role. This provides access to most Beekeeper Studio features.

This will *not* provide access to the full functionality of your BigQuery cluster. If you need more advanced access we recommend using `BigQuery Admin` to unlock schema and data modification.

Your Google Cloud administrator can likely provide more fine grained controls if needed.


## Connecting from Beekeeper Studio

Once you have set up your IAM user and downloaded your private key JSON file, you only need the following information to connect to your Big Query instance:

1. Google Cloud Project ID
2. Default Big Query dataset to use once connected
3. Path to the JSON primary key file

![Image Alt Tag](../../assets/images/google-bigquery-101.png)


## Gotcha: Use region-specific datasets only

When setting up a dataset in BigQuery be sure to explicitly specify a region.

![Image Alt Tag](../../assets/images/google-bigquery-100.png)

If you choose 'Multi-Region' many common functions will not work, both in Beekeeper Studio and in the Google Cloud console.

Examples of tasks that will not work with multi-region enabled:

- Uploading a CSV
- Viewing table structure
- Importing data
- Linking data from a storage bucket
- Linking data from S3
- Copying data from S3 or a storage bucket



When connecting to BigQuery from Beekeeper Studio, provide the path to this private key JSON file to authenticate yourself with Google Cloud. This is the only authentication method currently supported by Beekeeper Studio.






