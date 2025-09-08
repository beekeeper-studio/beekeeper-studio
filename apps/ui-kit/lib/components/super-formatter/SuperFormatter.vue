<template>
  <section "BksUiKit BksSuperFormatter" ref="">
    <div>
      
    </div>
    <div>

    </div>
  </section>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  data() {
    return {
      unsavedPreset: {},
      language: ''
    }
  },
  mixins: [],
  props: {
    value: String,
    canAddPresets: Boolean,
    clipboard: Function,
    defaultPreset: {
      type: Object,
      default: () => ({
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'preserve',
        dataTypeCase: 'preserve',
        functionCase: 'preserve',
        logicalOperatorNewline: 'before',
        expressionWidth: 50,
        linesBetweenQueries: 1,
        denseOperators: false,
        newlineBeforeSemicolon: false
      })
    },
    presets: {
      type: Array,
      default: () => []
    },
    sqlText: String,
    formatterDialect: Function
  },
  watch: {
    entities() {
      if (!this.textEditor) return;
      this.applyCompletionSource();
    },
  },
  computed: {

  },
  methods: {
    
  },
  mounted() {
    this.unsavedPreset = this.defaultPreset
    // this.internalContextMenuItems = this.contextMenuItemsModifier;
  }
})
</script>

<style>

</style>
