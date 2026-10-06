<template>
  <div class="BksUiKit BksTextEditor" ref="editor" v-bind="$attrs" />
</template>

<script lang="ts">
import mixin from "./mixin";
import Vue from "vue";

export default Vue.extend({
  mixins: [mixin],
});
</script>
