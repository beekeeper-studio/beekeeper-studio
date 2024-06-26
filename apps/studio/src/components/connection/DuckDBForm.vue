<template>
  <div class="duckdb-form">
    <div class="form-group col">
      <label for="default-database" required>Database File</label>
      <file-picker
        v-model="config.defaultDatabase"
        input-id="default-database"
        editable
        :options="{
          filters: [
            { name: 'DuckDB Files', extensions: ['duckdb', 'db', 'ddb'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        }"
      />
      <snap-external-warning />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import FilePicker from "@/components/common/form/FilePicker.vue";
import SnapExternalWarning from "@/components/connection/SnapExternalWarning.vue";
export default Vue.extend({
  props: ["config"],
  components: { FilePicker, SnapExternalWarning },
});
</script>
