/* eslint no-console: 0 */
process.on('uncaughtException', function onError(err) {
  console.log(err.stack);
});
