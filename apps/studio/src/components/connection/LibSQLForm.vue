<template>
  <div class="libsql-form">
    <div class="row">
      <div class="form-group col">
        <label for="connection-mode">Connection Mode</label>
        <select
          id="connection-mode"
          v-model="config.libsqlOptions.mode"
        >
          <option value="url">
            URL
          </option>
          <option value="file">
            File
          </option>
        </select>
      </div>
      <div class="form-group col" v-show="config.libsqlOptions.mode === 'url'">
        <label for="url" required>
          Database URL
          <i
            class="material-icons"
            v-tooltip="{
              content: `Supports <b>libsql:</b>, <b>http:</b>, <b>https:</b>,
                        <b>ws:</b>, <b>wss:</b> and <b>file:</b> URL. Pass
                        <b>:memory:</b> or leave it empty to open an in-memory
                        database.`,
              html: true,
            }"
          >
            help_outlined
          </i>
        </label>
        <input
          id="url"
          class="form-control"
          v-model="config.libsqlOptions.url"
          type="text"
          name="url"
        >
      </div>
      <div class="form-group col" v-show="config.libsqlOptions.mode === 'url'">
        <label for="auth-token" required>Authentication Token</label>
        <textarea
          id="auth-token"
          class="form-control"
          v-model="config.libsqlOptions.authToken"
          type="text"
          name="auth-token"
        />
      </div>
      <div class="form-group col" v-show="config.libsqlOptions.mode === 'file'">
        <label for="default-database" required>Database File</label>
        <file-picker
          v-model="config.libsqlOptions.file"
          input-id="default-database"
        />
        <snap-external-warning />
      </div>
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
