<template>
  <div class="BksUiKit BksTextEditor">
    <textarea
      name="editor"
      class="BksTextEditor-textarea editor"
      ref="editor"
      id=""
      cols="30"
      rows="10"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import mixin from "./mixin";

export default Vue.extend({
  mixins: [mixin],
});
</script>
