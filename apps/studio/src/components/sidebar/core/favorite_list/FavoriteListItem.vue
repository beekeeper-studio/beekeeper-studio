<template>
<div class="list-item" @contextmenu.prevent.stop="openContextMenu($event, item)">
  <a class="list-item-btn" @click.prevent="$emit('select', item)" @dblclick.prevent="$emit('open', item)" :class="{active, selected}">
    <i class="item-icon query material-icons">code</i>
    <div class="list-title flex-col">
      <span class="item-text title truncate expand" :title="item.title">{{item.title}}</span>
      <span class="database subtitle"><span :title="item.database" >{{item.database}}</span></span>
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

  computed: {
    ...mapState('data/queryFolders', {'folders': 'items'}),
    moveToOptions() {
      return this.folders
        .filter((folder) => folder.id !== this.item.queryFolderId)
        .map((folder: IQueryFolder) => {
        return {
          name: `Move to ${folder.name}`,
          handler: this.moveItem,
          folder
        }
      })
    },
  },
  methods: {
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
      this.$bks.openMenu({
        item, event,
        options: [
          {
            name: "Open",
            handler: ({ item }) => this.$emit('open', item)
          },
          {
            name: "Delete",
            handler: ({ item }) => this.$emit('remove', item)
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