import QueryCompiler from 'knex/lib/query/querycompiler.js';
import assert from 'assert';

class BQ_QueryCompiler extends QueryCompiler {
  /* 
    NOTE(@DAY): this is just the bare minimum to get the app working with BQ
    I'm putting this structure in now just in case we want to improve it.
  */
}

export default BQ_QueryCompiler;