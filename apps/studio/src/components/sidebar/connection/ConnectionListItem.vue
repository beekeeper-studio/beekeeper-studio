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
            <span class="truncate">{{ this.config.bastionHostString }}</span>&nbsp;>&nbsp;
          </span>
          <span class="ssh" v-if="this.config.sshHost">
            <span class="truncate">{{ this.config.sshHostString }}</span>&nbsp;>&nbsp;
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
import TimeAgo from 'javascript-time-ago'
export default {
  // recent list is 'recent connections'
  // if that is true, we need to find the companion saved connection
  props: ['config', 'isRecentList', 'selectedConfig', 'showDuplicate'],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    split: null
  }),
  computed: {
    classList() {
      return {
        'active': this.savedConnection && this.selectedConfig ? this.savedConnection.id === this.selectedConfig.id : false
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

      return this.config.simpleConnectionString
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
        return this.config.simpleConnectionString
      }
    },
    title() {
      return this.config.fullConnectionString
    },
    savedConnection() {

      if (this.isRecentList) {
        if (!this.config.savedConnectionId) return null
        return this.$store.state.connectionConfigs.find(c => c.id === this.config.savedConnectionId)
      } else {
        return this.config
      }
    },
  },
  mounted() {

  },
  methods: {
    showContextMenu(event) {
      this.$bks.openMenu({
        event,
        item: this.config,
        options: [
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
      })
    },
    click() {
      if (this.savedConnection) {
        this.$emit('edit', this.savedConnection)
      } else {
        this.$emit('edit', this.config.toNewConnection())
      }
    },
    doubleClick() {
      if (this.savedConnection) {
        this.$emit('doubleClick', this.savedConnection)
      } else {
        this.$emit('doubleClick', this.config.toNewConnection())
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
        await this.$copyText(this.config.fullConnectionString)
        this.$noty.success(`The ${this.connectionType} was successfully copied!`)
      } catch (err) {
        this.$noty.success(`The ${this.connectionType} could not be copied!`)
      }
    }
  }

}
</script>
