import SchemaBuilder from './components/SchemaBuilder.vue'
import formatters from './lib/tabulator'
import { getDialectData } from './lib/dialects'

import 'tabulator-tables/dist/css/tabulator.css'

export default {
   SchemaBuilder, formatters, sql: {
     getDialectData
   },
   Components: {
     SchemaBuilder
   }
}