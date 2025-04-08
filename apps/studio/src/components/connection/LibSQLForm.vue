<template>
  <div class="libsql-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        {{ $t('LibSQL support is still in beta. Please report any problems on') }} <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">{{ $t('our issue tracker') }}</a>.
      </span>
    </div>
    <div class="form-group col">
      <label for="connection-mode">{{ $t('Connection Mode') }}</label>
      <select id="connection-mode" v-model="config.libsqlOptions.mode">
        <option value="url">
          {{ $t('URL') }}
        </option>
        <option value="file">
          {{ $t('File') }}
        </option>
      </select>
    </div>
    <template v-if="config.libsqlOptions.mode === 'url'">
      <div class="form-group col">
        <label for="url" required>
          {{ $t('Database URL') }}
          <i
            class="material-icons"
            v-tooltip="{
              content: $t(`Supports <b>libsql:</b>, <b>http:</b>, <b>https:</b>,
                          <b>ws:</b>, <b>wss:</b> and <b>file:</b> URL. Pass
                          <b>:memory:</b> or leave it empty to open an in-memory
                          database.`),
              html: true,
            }"
          >
            help_outlined
          </i>
        </label>
        <input
          id="url"
          class="form-control"
          v-model="config.defaultDatabase"
          type="text"
          name="url"
        >
      </div>
      <div class="form-group col">
        <label for="auth-token" required>{{ $t('Authentication Token') }}</label>
        <textarea
          id="auth-token"
          class="form-control"
          v-model="config.libsqlOptions.authToken"
          type="text"
          name="auth-token"
        />
      </div>
    </template>
    <template v-if="config.libsqlOptions.mode === 'file'">
      <div class="form-group col">
        <label for="default-database" required>{{ $t('Database File') }}</label>
        <file-picker
          v-model="config.defaultDatabase"
          input-id="default-database"
        />
        <snap-external-warning />
      </div>
    </template>
    <toggle-form-area :title="$t('Embedded Replica')">
      <div class="alert alert-info">
        <i class="material-icons-outlined">info</i>
        <span>{{ $t('Make sure your local file has been used for replica or it\'s a non existing file.') }}</span>
      </div>
      <div class="form-group col">
        <label for="sync-url" required>{{ $t('Sync URL') }}</label>
        <input
          id="sync-url"
          class="form-control"
          v-model="config.libsqlOptions.syncUrl"
          type="text"
          name="syncUrl"
        >
      </div>
      <div class="form-group col">
        <label for="auth-token" required>{{ $t('Authentication Token') }}</label>
        <textarea
          id="auth-token"
          class="form-control"
          v-model="config.libsqlOptions.authToken"
          type="text"
          name="auth-token"
        />
      </div>
      <div class="form-group col">
        <label for="sync-period" required>{{ $t('Sync Period') }} <span class="hint">({{ $t('optional, in seconds') }})</span></label>
        <input
          id="sync-period"
          class="form-control"
          v-model="config.libsqlOptions.syncPeriod"
          type="number"
          name="syncPeriod"
        >
      </div>
    </toggle-form-area>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import FilePicker from "@/components/common/form/FilePicker.vue";
import SnapExternalWarning from "@/components/connection/SnapExternalWarning.vue";
import ToggleFormArea from "../common/ToggleFormArea.vue";
export default Vue.extend({
  props: ["config"],
  components: { FilePicker, SnapExternalWarning, ToggleFormArea },
});
</script>
