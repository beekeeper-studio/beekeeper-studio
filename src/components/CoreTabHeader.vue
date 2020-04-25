<template>
  <li class="nav-item">
    <a
      class="nav-link"
      @click.prevent.stop="$emit('click', tab)"
      :class="{ active: selected }"
    >
      <span class="expand truncate">{{title}}</span>
      <span class="tab-close" :class="{unsaved: tab.unsavedChanges}" @click.prevent.stop="$emit('close', tab)">
        <i class="material-icons close">close</i>
        <i class="material-icons unsaved-icon" >fiber_manual_record</i>
      </span>
    </a>
  </li>
</template>
<script>
  export default {
    props: ['tab', 'selected'],
    data() {
      return {
        unsaved: false,
      }
    },
    watch: {
    },
    computed: {
      cleanText() {
        // no spaces
        if (!this.tab.text) {
          return null
        }
        const result = this.tab.text.replace(/\s+/, '')
        return result.length == 0 ? null : result
      },
      title() {
        if (this.tab.type === 'query') {
          if (this.tab.query && this.tab.query.title) {
            return this.tab.query.title
          }
          if (!this.cleanText) {
            return this.tab.title
          }

          if (this.tab.query.text.length >= 32) {
            return `${this.tab.query.text.substring(0, 32)}...`
          } else {
            return this.tab.query.text
          }
        } else if (this.tab.type === 'table') {
          return this.tab.table.name;
        }
        return this.tab.title
      }
    },

  }

</script>
