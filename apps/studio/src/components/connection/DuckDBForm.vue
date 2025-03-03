<template>
  <div class="duckdb-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        DuckDB support is still in beta. Please report any problems on <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">our issue tracker</a>.
      </span>
    </div>
    <div class="form-group col">
      <label for="default-database" required>Database File</label>
      <file-picker
        v-model="config.defaultDatabase"
        input-id="default-database"
        editable
        show-create-button
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
