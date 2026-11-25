import _ from 'lodash';

// The fields SavedConnection.parse() fills in from a connection URL (ssl,
// trustServerCertificate and the CockroachDB options are handled below). The
// parsed object is a whole new SavedConnection, so everything else on it is just
// that entity's defaults: id, name, folder, label, SSH, timestamps, and so on.
const COCKROACH_OPTIONS = ['cluster', 'jwtAuthEnabled'] as const;

const URL_FIELDS = [
  'connectionType',
  'host',
  'port',
  'username',
  'password',
  'defaultDatabase',
] as const;

/**
 * Applies a parsed connection URL onto the connection being edited.
 *
 * Only the fields that come from the URL are copied, so importing while editing a
 * saved connection updates it in place (it keeps its id, name, folder, SSH
 * settings, ...) instead of resetting them to defaults and saving a new record.
 */
export function applyImportedUrl<T extends Record<string, any>>(config: T, parsed: Record<string, any>): T {
  Object.assign(config, _.pick(parsed, URL_FIELDS));
  // parse() only ever switches these on, so an unset value is just the default and
  // must not turn off what the connection already has.
  if (parsed.ssl) config.ssl = true;
  if (parsed.trustServerCertificate) config.trustServerCertificate = true;
  // `options` carries driver-specific settings and a new entity starts with some
  // of its own (connectionMethod), so only take the keys parse() adds.
  const urlOptions = _.pick(parsed.options, COCKROACH_OPTIONS);
  if (!_.isEmpty(urlOptions)) {
    config.options = { ...config.options, ...urlOptions };
  }
  return config;
}
