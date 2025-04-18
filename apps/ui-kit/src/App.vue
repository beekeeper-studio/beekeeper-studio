<template>
  <text-editor
    :value="value"
    :ls-client-config="lsClientConfig"
    @bks-value-change="handleValueChange"
  />
</template>

<script lang="ts">
import { LSClientConfiguration } from "../lib/components/text-editor-v2";
import TextEditor from "../lib/components/text-editor-v2/TextEditor.vue";

export default {
  components: { TextEditor },
  data() {
    return {
      value: "select * from",
    };
  },
  computed: {
    lsClientConfig(): LSClientConfiguration {
      return {
        wsUri: "ws://localhost:3000/server",
        rootUri: __PROJECT_ROOT__ + "/tests/fixtures/",
        documentUri: __PROJECT_ROOT__ + "/tests/fixtures/test.sql",
        languageId: "sql",
      };
    },
  },
  methods: {
    handleValueChange(detail) {
      this.value = detail.value;
    },
  },
};
</script>
