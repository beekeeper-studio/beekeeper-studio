import KnexTableBuilder from 'knex/lib/schema/tablebuilder';

class TableBuilder_Trino extends KnexTableBuilder {
  // Trino has the same basic table building functionality as the default builder
  // This class extends the base implementation and can be used to add 
  // Trino-specific table building features if needed in the future
}

export default TableBuilder_Trino;