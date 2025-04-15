<template>
  <div id="app">
    <h1>Component Testing Environment</h1>

    <div>
      <h2>Text Editor V2</h2>

      <text-editor-v2
        :value="value"
        :read-only="readOnly"
        :height="200"
        @bks-value-change="handleValueChange"
      />
      <label>
        Read only
        <input type="checkbox" v-model="readOnly" />
      </label>
      <pre>
        value: "{{ value }}"
      </pre>
    </div>

    <div>
      <h2>Text Editor V1</h2>

      <text-editor
        :value="value"
        :read-only="readOnly"
        :height="200"
        @bks-value-change="handleValueChange"
      />
      <label>
        Read only
        <input type="checkbox" v-model="readOnly" />
      </label>
      <pre>
        value: "{{ value }}"
      </pre>
    </div>
  </div>
</template>

<script>
import TextEditorV2 from "../lib/components/text-editor-v2/TextEditor.vue";
import TextEditor from "../lib/components/text-editor/TextEditor.vue";
import "../lib/components/text-editor-v2/text-editor.scss";
import "../lib/components/text-editor/text-editor.scss";

export default {
  name: "App",
  components: { TextEditorV2, TextEditor },
  data() {
    return {
      value: "",
      readOnly: false,
    };
  },
  methods: {
    handleValueChange(detail) {
      this.value = detail.value;
    },
  },
};
</script>
