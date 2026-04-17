<template>
  <div class="duckdb-form">
    <div class="form-group col">
      <label for="default-database" required>Database File</label>
      <file-picker
        v-model="config.defaultDatabase"
        input-id="default-database"
        editable
        show-create-button
      />
      <platform-warning location="database-file" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import FilePicker from "@/components/common/form/FilePicker.vue";
import PlatformWarning from "@/components/connection/PlatformWarning.vue";
export default Vue.extend({
  props: ["config"],
  components: { FilePicker, PlatformWarning },
});
</script>
