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
      <span :class="`connection-label connection-label-color-${labelColor}`" />
      <div class="connection-title flex-col expand">
        <div class="title">
          {{ label }}
        </div>
        <div class="subtitle">
          <span
            class="bastion"
            v-if="displayConfig.sshBastionHost && !privacyMode"
          >
            <span class="truncate">{{ displayConfig.sshBastionHost }}</span>&nbsp;>&nbsp;
          </span>
          <span
            class="ssh"
            v-if="displayConfig.sshHost && !privacyMode"
          >
            <span class="truncate">{{ displayConfig.sshHost }}</span>&nbsp;>&nbsp;
          </span>
          <span class="connection">
            <span>
              {{ privacyMode ? '******' : subtitleSimple }}
            </span>
          </span>
        </div>
      </div>
      <span class="badge"><span>{{ displayConfig.connectionType }}</span></span>
      <span
        v-if="!isRecentList"
        class="actions"
        :class="{'pinned': pinned}"
      >
        <span
          v-if="!pinned"
          @mousedown.prevent.stop="pin"
          :title="'Pin'"
          class="btn-fab pin"
        ><i class="bk-pin" /></span>
        <span
          v-if="pinned"
          @mousedown.prevent.stop="unpin"
          :title="'Unpin'"
          class="btn-fab unpin"
        ><i class="material-icons">clear</i></span>
        <span
          v-if="pinned"
          @mousedown.prevent.stop="unpin"
          class="btn-fab pinned"
        >
          <i
            class="bk-pin"
            :title="'Unpin'"
          />
          <i class="material-icons">clear</i>
        </span>
      </span>
    </a>
  </div>
</template>
<script>
import TimeAgo from 'javascript-time-ago'
import { mapGetters, mapState } from 'vuex'
import { isUltimateType } from '@/common/interfaces/IConnection'

export default {
  // recent list is 'recent connections'
  // if that is true, we need to find the companion saved connection
  props: [
    'config',
    'isRecentList',
    'selectedConfig',
    'showDuplicate',
    'pinned',
    'privacyMode'
  ],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    split: null
  }),
  computed: {
    ...mapState('data/connections', {'connectionConfigs': 'items'}),
    ...mapState('data/connectionFolders', {'folders': 'items'}),
    ...mapGetters(['isCloud']),
    moveToOptions() {
      const rootById = {}
      this.folders.forEach(f => { if (!f.parentId) rootById[f.id] = f.name })
      return this.folders
        .filter(folder => folder.id !== this.config.connectionFolderId)
        .map(folder => {
          let name
          if (!folder.parentId) {
            const hasSubs = this.folders.some(f => f.parentId === folder.id)
            name = hasSubs ? `Move to ${folder.name} (top level)` : `Move to ${folder.name}`
          } else {
            const parentName = rootById[folder.parentId] || ''
            name = `Move to ${parentName} \u2192 ${folder.name}`
          }
          return { name, slug: `move-${folder.id}`, handler: this.moveItem, folder }
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
      if (this.savedConnection && this.savedConnection.name && this.savedConnection.name.trim()) {
        return this.savedConnection.name
      } else if ((this.displayConfig.connectionType === 'sqlite' || this.displayConfig.connectionType === 'libsql') && this.displayConfig.defaultDatabase) {
        return window.main.basename(this.displayConfig.defaultDatabase)
      } else if (this.displayConfig.connectionType === 'sqlanywhere' && this.displayConfig.sqlAnywhereOptions?.mode === 'file' && this.displayConfig.sqlAnywhereOptions?.databaseFile) {
        return window.main.basename(this.displayConfig.sqlAnywhereOptions.databaseFile);
      }

      return this.$bks.simpleConnectionString(this.displayConfig)
    },
    connectionType() {
      if (this.displayConfig.connectionType === 'sqlite' || this.displayConfig.connectionType === 'libsql') {
        return 'path'
      }

      return 'Url'
    },
    subtitleSimple() {
      if (this.isRecentList) {
        return this.timeAgo.format(this.config.updatedAt)
      } else {
        return this.$bks.simpleConnectionString(this.displayConfig)
      }
    },
    title() {
      return this.privacyMode ?
        'Connection details hidden by Privacy Mode' :
        this.$bks.buildConnectionString(this.displayConfig)
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
    // For display purposes only: prefer the linked saved connection when this
    // is a recent-list row, so edits to the saved connection (host, port, ssh,
    // etc.) propagate to the recent connections list. Falls back to the
    // used_connection snapshot when the saved connection is gone (orphan
    // recent entry).
    displayConfig() {
      return this.savedConnection || this.config
    },
  },
  methods: {
    showContextMenu(event) {
      const ultimateCheck = this.$store.getters.isUltimate
        ? true
        : !isUltimateType(this.displayConfig.connectionType)

      const options = [
        {
          name: "View",
          slug: 'view',
          handler: (blob) => this.click(blob.item)
        },
        ultimateCheck && {
          name: 'Connect',
          slug: 'connect',
          handler: (blob) => this.doubleClick(blob.item)
        },
        !this.isRecentList && {
          name: this.pinned ? 'Unpin' : 'Pin',
          handler: () => this.pinned ? this.unpin() : this.pin()
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
      ].filter(v => v)

      if (this.isCloud || this.folders.length > 0) {
        options.push({ type: 'divider' })
        if (!this.isCloud && this.config.connectionFolderId) {
          options.push({ name: 'Move to top level', handler: () => this.moveToRoot() })
        }
        options.push(...this.moveToOptions)
      }

      this.$bks.openMenu({
        event,
        item: this.config,
        options
      })
    },
    async moveToRoot() {
      try {
        await this.$store.dispatch('data/connectionFolders/moveToFolder', { connection: this.config, folder: null })
      } catch (ex) {
        this.$noty.error(`Move Error: ${ex.message}`)
        console.error(ex)
      }
    },
    async moveItem({ item, option }) {
      try {
        const folder = option.folder
        if (!folder || !folder.id) return
        await this.$store.dispatch('data/connectionFolders/moveToFolder', { connection: item, folder })
      } catch(ex) {
        this.$noty.error(`Move Error: ${ex.message}`)
        console.error(ex)
      }
    },
    async click() {
      if (this.savedConnection) {
        this.$emit('edit', this.savedConnection)
      } else {
        this.$emit('edit', this.config)
      }
    },
    async doubleClick() {
      if (this.savedConnection) {
        this.$emit('doubleClick', this.savedConnection)
      } else {
        this.$emit('doubleClick', this.config)
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
        await this.$copyText(this.$bks.buildConnectionString(this.displayConfig))
        this.$noty.success(`The ${this.connectionType} was successfully copied!`)
      } catch (err) {
        this.$noty.success(`The ${this.connectionType} could not be copied!`)
      }
    },
    pin() {
      this.$store.dispatch('pinnedConnections/add', this.config);
    },
    unpin() {
      this.$store.dispatch('pinnedConnections/remove', this.config);
    }
  }

}
</script>
