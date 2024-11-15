import _ from 'lodash'
import QueryCompiler from 'knex/lib/dialects/oracledb/query/oracledb-querycompiler'

export default class QueryCompiler_Oracledb extends QueryCompiler {
  _prepOutbindings(paramValues, paramReturning) {
    const result = {};
    let params = paramValues || [];
    let returning = paramReturning || [];
    if (!Array.isArray(params) && _.isPlainObject(paramValues)) {
      params = [params];
    }
    // Always wrap returning argument in array
    if (returning && !Array.isArray(returning)) {
      returning = [returning];
    }

    const outBinding = [];
    // Handle Buffer value as Blob
    _.each(params, function (values, index) {
      if (returning[0] === '*') {
        outBinding[index] = ['ROWID'];
      } else {
        outBinding[index] = _.clone(returning);
      }
      _.each(values, function (value, key) {
        // NOTE: This breaks the query string when Buffer object is passed as
        // a parameter.
        // if (value instanceof Buffer) {
        //   values[key] = new BlobHelper(key, value);
        //
        //   // Delete blob duplicate in returning
        //   const blobIndex = outBinding[index].indexOf(key);
        //   if (blobIndex >= 0) {
        //     outBinding[index].splice(blobIndex, 1);
        //     values[key].returning = true;
        //   }
        //   outBinding[index].push(values[key]);
        // }
        if (value === undefined) {
          delete params[index][key];
        }
      });
    });
    result.returning = returning;
    result.outBinding = outBinding;
    result.values = params;
    return result;
  }
}
