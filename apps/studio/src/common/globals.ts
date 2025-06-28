

export default {
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
  freeTrialDays: 14,
  psqlTimeout: 15000, // 15 seconds
  psqlIdleTimeout: 20000,
  defaultChunkSize: 100,
  largeFieldWidth: 300,
  maxColumnWidth: 1000,
  minColumnWidth: 100,
  maxInitialWidth: 500,
  maxDetailViewTextLength: 30,
  bigTableColumnWidth: 125,
  maxColumnWidthTableInfo: 300,
  workspaceCheckInterval: 5000, // 5 seconds
  dataCheckInterval: 1000 * 30, // 30 secs
  trialNotificationInterval: 1000 * 60 * 60 * 12, // 12 hours
  licenseCheckInterval: 1000 * 60 * 10, // once per 10 minutes
  errorNoticeTimeout: 60 * 1000, // 1 minute
  tableListItemHeight: 22.8, // in pixels
  // for azure auth
  pollingTimeout: 60 * 1000, // 1 minute
  clientId: '6eabc37c-bcc5-41fa-9a90-f6c5ab2aabcb',
  iamRefreshTime: 13 * 60 * 1000, // 13 minutes
  iamExpiryTime: 15 * 60 * 1000, // 15 minutes
  iamRefreshBeforeTime: 2 * 60 * 1000, // 2 minutes
  azureCloudTokenUrl: 'https://app.beekeeperstudio.io/api/cloud_tokens',
  azureCloudScopes: ['https://database.windows.net/.default', 'offline_access'],
  firebird: {
    poolSize: 5,
  },
}


