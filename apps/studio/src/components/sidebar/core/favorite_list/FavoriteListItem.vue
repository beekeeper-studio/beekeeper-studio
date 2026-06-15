<template>
  <div
    class="list-item"
    @contextmenu.prevent="openContextMenu($event, item)"
  >
    <a
      class="list-item-btn"
      v-tooltip.bottom.delay="{
        content: truncatedText,
        delay: { show: 500 },
      }"
      @click.prevent="$emit('select', item)"
      @dblclick.prevent="$emit('open', item)"
      :class="{active, selected}"
    >
      <i class="item-icon query material-icons">code</i>
      <div class="list-text">
        <div class="list-title flex-col">
          <editable-text
            :initial-value="item.title"
            :rename="rename"
            @submit="submitRename"
            @cancel="rename = false"
          />
        </div>
        <div class="database subtitle"><span>{{ subtitle }}</span></div>
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
import EditableText from '@/components/common/EditableText.vue'

export default Vue.extend({
  components: { EditableText },
  props: ['item', 'selected', 'active'],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    rename: false,
  }),
  computed: {
    ...mapGetters(['isCloud']),
    ...mapState('data/queryFolders', {'folders': 'items'}),
    truncatedText() {
      const excerpt: string = this.item.excerpt ?? ''
      return _.truncate(excerpt.trim().replaceAll('\n', ''), { length: 60 })
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
      // Stop here and propagate the event if right clicking an input element
      if (event.target.tagName === 'INPUT') {
        return;
      }

      event.stopPropagation();

      const canWrite = this.item.canWrite ?? true;

      const options = [
        {
          name: "Open",
          handler: ({ item }) => this.$emit('open', item)
        },
        {
          name: "Rename",
          hideIf: !canWrite,
          handler: () => {
            this.rename = true;
          },
        },
        {
          name: "Duplicate",
          handler: ({ item }) => this.$emit('duplicate', item)
        },
        {
          name: "Delete",
          hideIf: !canWrite,
          handler: ({ item }) => this.$emit('remove', item)
        },
        {
          name: "View Edit History",
          handler: ({ item }) => this.$emit('open-history', item)
        },
        {
          type: 'divider'
        },
        {
          name: "Export",
          handler: ({ item }) => this.$emit('export', item)
        },
      ].filter((item) => !item.hideIf)
      // ======== "Move to ..." options ========
      if (!canWrite) {
        // skip adding "Move to ..." options" if user can not write
      } else if (this.folders.length > 0) {
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
    async submitRename(title) {
      if (!title || title === this.item.title) {
        this.rename = false;
        return;
      }

      try {
        await this.$store.dispatch('data/queries/save', {
          id: this.item.id,
          title,
        });
      } catch (ex) {
        this.$noty.error(`Rename error: ${ex.userMessage ?? ex.message}`)
      } finally {
        this.rename = false;
      }
    },
  }

})
</script>
<style lang="scss" scoped>
.list-text {
  flex-grow: 1;
  font-size: 1rem;

}

.list-item-btn .list-text .list-title {
  position: relative;
  width: 100%;
  overflow: visible;
}
</style>
