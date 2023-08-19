import { Tabulator } from "tabulator-tables";
import { Vue } from "vue/types/vue";

declare module 'tabulator-tables' {
  namespace Tabulator {
    interface CellComponent {
      $bksVueInstance?: Vue
    }
  }
}

