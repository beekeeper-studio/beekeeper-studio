<template>
  <div v-if="!dismissed" class="alert alert-warning expired-folder-alert">
    <i class="material-icons-outlined">info</i>
    <div class="alert-body">
      Creating folders is disabled. An active license is required.
    </div>
    <button
      type="button"
      @click="dismiss"
      class="btn btn-fab btn-flat close-btn"
    >
      <i class="material-icons">close</i>
    </button>
  </div>
</template>

<script>
import { SmartLocalStorage } from "@/common/LocalStorage";

export default {
  name: "ExpiredFolderAlert",
  data() {
    return {
      dismissed: SmartLocalStorage.getBool('expiredFolderAlertDismissed'),
    };
  },
  methods: {
    dismiss() {
      this.dismissed = true;
      SmartLocalStorage.setBool('expiredFolderAlertDismissed', true);
    },
  },
};
</script>
