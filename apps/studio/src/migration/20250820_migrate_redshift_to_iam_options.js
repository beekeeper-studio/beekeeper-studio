import _ from 'lodash'

export default {
  name: "20250820_migrate_redshift_to_iam_options",
  async run(runner) {
    const tables = ['saved_connection', 'used_connection'];
    const fieldsToMove = [
      'awsProfile',
      'iamAuthenticationEnabled',
      'accessKeyId',
      'secretAccessKey',
      'awsRegion',
      'authType'
    ];

    for (const table of tables) {
      const records = await runner.query(`
        SELECT id, redshiftOptions, iamAuthOptions
        FROM ${table}
        WHERE redshiftOptions != '{}'
      `);
      if (!_.isArray(records)) continue;

      for (const record of records) {
        const redshiftOpts = JSON.parse(record.redshiftOptions || '{}');
        const iamOpts = JSON.parse(record.iamAuthOptions || '{}');

        let hasChanges = false;

        for (const field of fieldsToMove) {
          if (field in redshiftOpts) {
            iamOpts[field] = redshiftOpts[field];
            delete redshiftOpts[field];
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await runner.query(
            `UPDATE ${table}
             SET redshiftOptions = ?, iamAuthOptions = ?
             WHERE id = ?`,
            [JSON.stringify(redshiftOpts), JSON.stringify(iamOpts), record.id]
          );
        }
      }
    }
  }
};
