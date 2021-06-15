import SchemaBuilder from './components/SchemaBuilder.vue'
import formatters from './lib/tabulator'
import { getDialectData } from './lib/dialects'

export default {
   SchemaBuilder, formatters, sql: {
     getDialectData
   }
}