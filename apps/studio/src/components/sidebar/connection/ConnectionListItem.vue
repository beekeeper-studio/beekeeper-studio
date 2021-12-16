<template>
  <div 
    class="list-item"
    :title="title"
    @contextmenu.stop.prevent="showContextMenu"
  >
    <a
      href=""
      class="list-item-btn"
      :class="classList"
      @click.prevent="click(config)"
      @dblclick.prevent="doubleClick(config)"
    >
      <span :class="`connection-label connection-label-color-${labelColor}`"></span>
      <div class="connection-title flex-col expand">
        <div class="title">{{label}}</div>
        <div class="subtitle"> 
          <span class="bastion" v-if="this.config.sshBastionHost">
            <span class="truncate">{{ this.config.sshBastionHost }}</span>&nbsp;>&nbsp;
          </span>
          <span class="ssh" v-if="this.config.sshHost">
            <span class="truncate">{{ this.config.sshHost }}</span>&nbsp;>&nbsp;
          </span>
          <span class="connection">
            <span>{{ subtitleSimple }}</span>
          </span>
        </div>
      </div>
      <span class="badge"><span>{{config.connectionType}}</span></span>
    </a>
  </div>
</template>
<script>
import path from 'path'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
import { mapGetters, mapState } from 'vuex'
export default {
  // recent list is 'recent connections'
  // if that is true, we need to find the companion saved connection
  props: ['config', 'isRecentList', 'selectedConfig', 'showDuplicate'],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    split: null
  }),
  computed: {
    ...mapState('data/connections', {'connectionConfigs': 'items'}),
    ...mapState('data/connectionFolders', {'folders': 'items'}),
    ...mapGetters(['isCloud']),
    moveToOptions() {
      return this.folders
        .filter((folder) => folder.id !== this.config.connectionFolderId)
        .map((folder) => {
        return {
          name: `Move to ${folder.name}`,
          slug: `move-${folder.id}`,
          handler: this.moveItem,
          folder
        }
      })
    },
    classList() {
      return {
        'active': this.savedConnection && this.selectedConfig ? this.savedConnection === this.selectedConfig : false
      }
    },
    labelColor() {
      return this.savedConnection ? this.savedConnection.labelColor : 'default'
    },
    label() {
      if (this.savedConnection) {
        return this.savedConnection.name
      } else if (this.config.connectionType === 'sqlite') {
        return path.basename(this.config.defaultDatabase)
      }

      return this.$bks.simpleConnectionString(this.config)
    },
    connectionType() {
      if (this.config.connectionType === 'sqlite') {
        return 'path'
      }

      return 'Url'
    },
    subtitleSimple() {
      if (this.isRecentList) {
        return this.timeAgo.format(this.config.updatedAt)
      } else {
        return this.$bks.simpleConnectionString(this.config)
      }
    },
    title() {
      return this.$bks.buildConnectionString(this.config)
    },
    savedConnection() {

      if (this.isRecentList) {
        if (!this.config.connectionId || !this.config.workspaceId) return null

        return this.connectionConfigs.find((c) => 
          c.id === this.config.connectionId &&
          c.workspaceId === this.config.workspaceId
        )
      } else {
        return this.config
      }
    },
  },
  mounted() {

  },
  methods: {
    showContextMenu(event) {
      const options = [
        {
          name: "View",
          slug: 'view',
          handler: (blob) => this.click(blob.item)
        },
        {
          name: 'Connect',
          slug: 'connect',
          handler: (blob) => this.doubleClick(blob.item)
        },
        {
          name: "Duplicate",
          slug: 'duplicate',
          handler: this.duplicate
        },
        {
          name: `Copy ${this.connectionType}`,
          handler: this.copyUrl
        },
        {
          name: "Remove",
          handler: this.remove
        },
      ]

      if (this.isCloud) {
        options.push(...[
          {
            type: 'divider'
          },
          ...this.moveToOptions
        ])
      }
      console.log('options', options)

      this.$bks.openMenu({
        event,
        item: this.config,
        options
      })
    },
    async moveItem({ item, option }) {
      try {
        const folder = option.folder
        if (!folder || !folder.id) return
        const updated = _.clone(item)
        updated.connectionFolderId = folder.id
        await this.$store.dispatch('data/connections/save', updated)
      } catch(ex) {
        this.$noty.error(`Move Error: ${ex.message}`)
        console.error(ex)
      }
    },
    async click() {
      if (this.savedConnection) {
        this.$emit('edit', this.savedConnection)
      } else {
        const editable = await this.$store.dispatch('data/connections/clone', this.config)
        this.$emit('edit', editable)
      }
    },
    async doubleClick() {
      if (this.savedConnection) {
        this.$emit('doubleClick', this.savedConnection)
      } else {
        const editable = await this.$store.dispatch('data/connections/clone', this.config)
        this.$emit('doubleClick', editable)
      }
    },
    remove() {
      this.$emit('remove', this.config)
    },
    duplicate() {
      this.$emit('duplicate', this.config)
    },
    async copyUrl() {
      try {
        await this.$copyText(this.$bks.buildConnectionString(this.config))
        this.$noty.success(`The ${this.connectionType} was successfully copied!`)
      } catch (err) {
        this.$noty.success(`The ${this.connectionType} could not be copied!`)
      }
    }
  }

}
</script>
