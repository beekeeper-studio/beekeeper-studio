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
            v-if="this.config.sshBastionHost && !privacyMode"
          >
            <span class="truncate">{{ this.config.sshBastionHost }}</span>&nbsp;>&nbsp;
          </span>
          <span
            class="ssh"
            v-if="this.config.sshHost && !privacyMode"
          >
            <span class="truncate">{{ this.config.sshHost }}</span>&nbsp;>&nbsp;
          </span>
          <span class="connection">
            <span>
              {{ privacyMode ? '******' : subtitleSimple }}
            </span>
          </span>
        </div>
      </div>
      <span class="badge"><span>{{ config.connectionType }}</span></span>
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
import _ from 'lodash'
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
      } else if (this.config.connectionType === 'sqlite' || this.config.connectionType === 'libsql') {
        return window.main.basename(this.config.defaultDatabase)
      } else if (this.config.connectionType === 'sqlanywhere' && this.config.sqlAnywhereOptions.mode === 'file') {
        return window.main.basename(this.config.sqlAnywhereOptions.databaseFile);
      }

      return this.$bks.simpleConnectionString(this.config)
    },
    connectionType() {
      if (this.config.connectionType === 'sqlite' || this.config.connectionType === 'libsql') {
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
      return this.privacyMode ?
        'Connection details hidden by Privacy Mode' :
        this.$bks.buildConnectionString(this.config)
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
  methods: {
    showContextMenu(event) {
      const ultimateCheck = this.$store.getters.isUltimate
        ? true
        : !isUltimateType(this.config.connectionType)

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

      if (this.isCloud) {
        options.push(...[
          {
            type: 'divider'
          },
          ...this.moveToOptions
        ])
      }

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
        await this.$copyText(this.$bks.buildConnectionString(this.config))
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
