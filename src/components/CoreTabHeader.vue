<template>
  <li class="nav-item">
    <a
      class="nav-link"
      @click.prevent="$emit('click', tab)"
      :class="{ active: selected }"
    >
      <span class="expand truncate">{{title}}</span>
      <span class="tab-close" @click.prevent.stop="$emit('close', tab)"><i class="material-icons">close</i></span>
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
      title() {
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
