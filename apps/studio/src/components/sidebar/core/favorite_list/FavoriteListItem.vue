<template>
  <div
    class="list-item"
    @contextmenu.prevent="openContextMenu($event, item)"
  >
    <a
      class="list-item-btn"
      :title="truncatedText"
      @click.prevent="$emit('select', item)"
      @dblclick.prevent="$emit('open', item)"
      :class="{active, selected}"
    >
      <i class="item-icon query material-icons">code</i>
      <div classs="list-text">
        <div class="list-title flex-col">
          <input
            v-if="renaming"
            ref="renameInput"
            v-model="renameValue"
            class="rename-input"
            @keyup.enter="submitRename"
            @keyup.esc="cancelRename"
            @blur="cancelRename"
            @click.stop
            @dblclick.stop
            @mousedown.stop
          >
          <span
            v-else
            class="item-text title truncate expand"
            @dblclick.stop.prevent="startRename"
          >{{ item.title }}</span>
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

export default Vue.extend({
  props: ['item', 'selected', 'active'],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    renaming: false,
    renameValue: '',
  }),
  computed: {
    ...mapGetters(['isCloud']),
    ...mapState('data/queryFolders', {'folders': 'items'}),
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
      if (event.target === this.$refs.renameInput) {
        return;
      }

      event.stopPropagation();

      const options = [
        {
          name: "Open",
          handler: ({ item }) => this.$emit('open', item)
        },
        {
          name: "Rename",
          handler: () => this.startRename()
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
      ]
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
    async startRename() {
      this.renaming = true;
      this.renameValue = this.item.title;

      await this.$nextTick();

      this.$refs.renameInput.focus();
      this.$refs.renameInput.select();
    },
    async submitRename() {
      if (!this.renaming) {
        return;
      }

      this.renaming = false;

      const title = this.renameValue.trim();

      if (!title || title === this.item.title) {
        return;
      }

      try {
        await this.$store.dispatch('data/queries/save', {
          id: this.item.id,
          title,
        });
      } catch (ex) {
        this.$noty.error(`Rename error: ${ex.userMessage ?? ex.message}`)
      }
    },
    cancelRename() {
      this.renaming = false;
    },
  }

})
</script>
<style lang="scss" scoped>
.rename-input {
  width: 100%;
  height: auto;
  padding-inline: 0.1rem;
  padding-block: 0.1rem;
  font-size: inherit;
  line-height: normal;
}
</style>
