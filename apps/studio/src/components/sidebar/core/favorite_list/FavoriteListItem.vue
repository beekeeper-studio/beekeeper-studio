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
import { mapState } from 'vuex'

export default Vue.extend({
  props: ['item', 'selected', 'active'],
  data: () => ({
  }),
  computed: {
    ...mapState('data/queryFolders', {'folders': 'items'}),
    truncatedText() {
      return _.truncate(this.item.text, { length: 100});
    },
    moveToOptions() {
      return this.folders
        .filter((folder) => folder.id !== this.item.queryFolderId)
        .map((folder: IQueryFolder) => {
        return {
          name: this.$t('Move to {name}', { name: folder.name }),
          handler: this.moveItem,
          folder
        }
      })
    },
    subtitle() {
      const result = []
      if (this.item.user?.name) result.push(`${this.item.user.name}`)
      if (this.item.createdAt) {
        if (_.isNumber(this.item.createdAt)) {
          result.push(this.$bks.getTimeAgo().format(new Date(this.item.createdAt * 1000)))
        } else {
          result.push(this.$bks.getTimeAgo().format(this.item.createdAt))
        }
      }
      return result.join(" ")
    }
  },
  methods: {
    async moveItem({ item, option }) {
      try {
        const folder = option.folder
        console.log(this.$t("moving item!"), folder)
        if (!folder || !folder.id) return
        const updated = _.clone(item)
        updated.queryFolderId = folder.id
        await this.$store.dispatch('data/queries/save', updated)

      } catch (ex) {
        this.$noty.error(this.$t('Move Error: {message}', { message: ex.message }))
        console.error(ex)
      }
    },
    openContextMenu(event, item) {
      this.$bks.openMenu({
        item, event,
        options: [
          {
            name: this.$t("Open"),
            handler: ({ item }) => this.$emit('open', item)
          },
          {
            name: this.$t("Rename"),
            handler: ({ item }) => this.$emit('rename', item)
            
          },
          {
            name: this.$t("Delete"),
            handler: ({ item }) => this.$emit('remove', item)
          },
          {
            type: 'divider'
          },
          {
            name: this.$t("Export"),
            handler: ({ item }) => this.$emit('export', item)
          },
          {
            type: 'divider'
          },
          ...this.moveToOptions
        ]
      })
    },
  }
  
})
</script>