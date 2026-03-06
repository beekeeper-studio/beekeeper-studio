<template>
  <div
    class="list-item"
    @contextmenu.prevent.stop="openContextMenu($event, item)"
  >
    <a
      class="list-item-btn"
      :title="truncatedText"
      @click.prevent="$emit('select', item)"
      @dblclick.prevent="$emit('open', item)"
      :class="{active, selected}"
    >
      <i class="item-icon query material-icons">code</i>
      <div class="list-title flex-col">
        <span class="item-text title truncate expand">{{ item.title }}</span>
        <span class="database subtitle"><span>{{ subtitle }}</span></span>
      </div>
    </a>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import { IQueryFolder } from '@/common/interfaces/IQueryFolder'
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import TimeAgo from 'javascript-time-ago'

export default Vue.extend({
  props: ['item', 'selected', 'active'],
  data: () => ({
    timeAgo: new TimeAgo('en-US')
  }),
  computed: {
    ...mapGetters(['isCloud']),
    ...mapState('data/queryFolders', {'folders': 'items'}),
    ...mapGetters(['isCloud']),
    truncatedText() {
      return _.truncate(this.item.excerpt, { length: 100});
    },
    moveToOptions() {
      const rootById: Record<number, string> = {}
      this.folders.forEach((f: IQueryFolder) => { if (!f.parentId) rootById[f.id] = f.name })
      return this.folders
        .filter((folder: IQueryFolder) => folder.id !== this.item.queryFolderId)
        .map((folder: IQueryFolder) => {
          let name: string
          if (!folder.parentId) {
            const hasSubs = this.folders.some((f: IQueryFolder) => f.parentId === folder.id)
            name = hasSubs ? `Move to ${folder.name} (top level)` : `Move to ${folder.name}`
          } else {
            const parentName = rootById[folder.parentId] || ''
            name = `Move to ${parentName} \u2192 ${folder.name}`
          }
          return { name, handler: this.moveItem, folder }
        })
    },
    shareQueryLink() {
      if (this.isCloud) {
        return {
            name: 'Share Link to Query',
            handler: ({ item }) => this.$emit('rename', item)
          }
      }
      
      return null
    },
    subtitle() {
      const result = []
      if (this.item.user?.name) result.push(`${this.item.user.name}`)
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
    async moveToRoot(item) {
      try {
        const updated = _.clone(item)
        updated.queryFolderId = null
        await this.$store.dispatch('data/queries/save', updated)
      } catch (ex) {
        this.$noty.error(`Move Error: ${ex.message}`)
        console.error(ex)
      }
    },
    async moveItem({ item, option }) {
      try {
        const folder = option.folder
        console.log("moving item!", folder)
        if (!folder || !folder.id) return
        const updated = _.clone(item)
        updated.queryFolderId = folder.id
        await this.$store.dispatch('data/queries/save', updated)

      } catch (ex) {
        this.$noty.error(`Move Error: ${ex.message}`)
        console.error(ex)
      }
    },
    openContextMenu(event, item) {
      const options = [
        {
          name: "Open",
          handler: ({ item }) => this.$emit('open', item)
        },
        {
          name: "Rename",
          handler: ({ item }) => this.$emit('rename', item)
        },
        {
          name: "Duplicate",
          handler: ({ item }) => this.$emit('duplicate', item)
        },
        {
          name: "Delete",
          handler: ({ item }) => this.$emit('remove', item)
        },
        {
          type: 'divider'
        },
        {
          name: "Export",
          handler: ({ item }) => this.$emit('export', item)
        },
        {
          type: 'divider'
        },
        ...this.moveToOptions
      ]

      if (this.isCloud) {
        options.push({
            name: 'Get Query Link',
            handler: ({ item }) => this.$emit('getQueryLink', item)
          })
      }

      if (this.folders.length > 0) {
        options.push({ type: 'divider' })
        if (!this.isCloud && this.item.queryFolderId) {
          options.push({ name: 'Move to top level', handler: ({ item }) => this.moveToRoot(item) })
        }
        options.push(...this.moveToOptions)
      }
      this.$bks.openMenu({
        item, event,
        options
      })
    },
  }
  
})
</script>
