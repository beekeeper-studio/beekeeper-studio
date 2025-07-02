<template>
  <div 
    class="list-item"
    @contextmenu.prevent.stop="openContextMenu($event, item)"
  >
    <a
      class="list-item-btn"
      @click.prevent="$emit('select', item)"
      @dblclick.prevent="$emit('open', item)"
      :class="{active, selected}"
    >
      <i class="item-icon material-icons">group</i>
      <div class="list-title flex-col">
        <span class="item-text title truncate expand">{{ item.user }}</span>
        <span class="subtitle"><span>{{ item.host }}</span></span>
      </div>
    </a>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'UserManagementListItem',
  props: {
    item: {
      type: Object,
      required: true,
      default: () => ({ user: '', host: 'No Host Info' })
    },
    selected: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    openContextMenu(event, item) {
      this.$bks.openMenu({
        item, event,
        options: [
          {
            name: "All Settings",
            handler: ({ item }) => this.$emit('all_settings', item)
          },
          {
            name: "Rename",
            handler: ({ item }) => this.$emit('rename', item)
          },
          {
            name: "Delete",
            handler: ({ item }) => this.$emit('delete', item)
          },
          {
            type: 'divider'
          },
        ]
      })
    },
    nicelySized(text) {
        if (text.length >= 128) {
          return `${text.substring(0, 128)}...`
        } else {
          return text
        }
      },
  }
})
</script>
