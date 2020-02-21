<template>
  <li class="nav-item">
    <a
      class="nav-link"
      @click.prevent="$emit('click', tab)"
      :class="{ active: selected }"
    >
      <span class="expand truncate">{{title}}</span>
      <span class="tab-close" :class="{unsaved: this.tab.unsavedChanges}" @click.prevent.stop="$emit('close', tab)">
        <i class="material-icons close">close</i>
        <i class="material-icons unsaved-icon" >fiber_manual_record</i>
      </span>
    </a>
  </li>
</template>
<script>
  export default {
    props: ['tab', 'selected'],
    computed: {
      cleanText() {
        // no spaces
        if (!this.tab.text) {
          return null
        }
        const result = this.tab.text.replace(/\s+/, '')
        return result.length == 0 ? null : result
      },
      unsaved() {
        console.log("unsaved computing")
        if (this.tab.unsavedChanges) {
          return "[unsaved] "
        } else {
          return ""
        }
      },
      title() {
        if (this.tab.query && this.tab.query.title) {
          return this.tab.query.title
        }
        if (!this.cleanText) {
          return this.tab.title
        }

        if (this.tab.text.length >= 32) {
          return `${this.tab.text.substring(0, 32)}...`
        } else {
          return this.tab.text
        }
      }
    }
  }

</script>
