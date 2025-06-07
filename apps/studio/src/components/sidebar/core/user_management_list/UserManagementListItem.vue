<template>
  <div 
    class="list-item" 
    @contextmenu.prevent.stop="openContextMenu($event, item)"
    style="height: 40px; display: flex; align-items: center;"
  >
    <a
      class="list-item-btn"
      @click.prevent="$emit('select', item)"
      @dblclick.prevent="$emit('open', item)"
      :class="{active, selected}"
      style="height: 100%; width: 100%; display: flex; align-items: center; gap: 8px;"
    >
      <i class="item-icon material-icons">group</i>
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
        <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          {{ item.user }}
        </span>
        <span style="font-size: 0.85em; display: flex; gap: 4px; color: #666; padding-right: 12px;">
          <span>{{ item.host }}</span>
        </span>
      </div>
    </a>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import { IQueryFolder } from '@/common/interfaces/IQueryFolder'
import Vue from 'vue'
import { mapState } from 'vuex'
import TimeAgo from 'javascript-time-ago'

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
  data: () => ({
    timeAgo: new TimeAgo('en-US')
  }),
  computed: {
    ...mapState('data/queryFolders', {'folders': 'items'}),
    truncatedText() {
      return _.truncate(this.item.text, { length: 100});
    },
    subtitle() {
      const result = []
      if (this.item.user?.user) result.push(`${this.item.user.user}`)
      if (this.item.createdAt) {
        if (_.isNumber(this.item.createdAt)) {
          result.push(this.timeAgo.format(new Date(this.item.createdAt * 1000)))
        } else {
          result.push(this.timeAgo.format(this.item.createdAt))
        }
      }
      return result.join(" ")
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
  }
})
</script>
