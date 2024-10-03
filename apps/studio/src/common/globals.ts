

export default {
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
  psqlTimeout: 15000, // 15 seconds
  psqlIdleTimeout: 20000,
  defaultChunkSize: 100,
  largeFieldWidth: 300,
  maxColumnWidth: 1000,
  minColumnWidth: 100,
  maxInitialWidth: 500,
  defaultTableTableSplitSizes: [75, 25],
  bigTableColumnWidth: 125,
  maxColumnWidthTableInfo: 300,
  workspaceCheckInterval: 5000, // 5 seconds
  dataCheckInterval: 1000 * 30, // 30 secs
  trialNotificationInterval: 1000 * 60 * 60 * 12, // 12 hours
  licenseCheckInterval: 1000 * 60 * 60, // once per hour
  errorNoticeTimeout: 60 * 1000, // 1 minute
  tableListItemHeight: 22.8, // in pixels
  // for azure auth
  pollingTimeout: 60 * 1000, // 1 minute
  clientId: '6eabc37c-bcc5-41fa-9a90-f6c5ab2aabcb'
}


