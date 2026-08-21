<template>
  <div
    class="list-item"
    @contextmenu.prevent="openContextMenu($event, item)"
  >
    <a
      class="list-item-btn"
      :title="title"
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
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import TimeAgo from 'javascript-time-ago'
import EditableText from '@/components/common/EditableText.vue'
import { AppEvent } from '@/common/AppEvent'

export default Vue.extend({
  components: { EditableText },
  props: ['item', 'selected', 'active'],
  data: () => ({
    timeAgo: new TimeAgo('en-US'),
    rename: false,
  }),
  computed: {
    ...mapGetters(["isCloud", "workspace"]),
    ...mapState('data/queryFolders', {'folders': 'items'}),
    truncatedText() {
      const excerpt: string = this.item.excerpt ?? ''
      return _.truncate(excerpt.trim().replaceAll('\n', ''), { length: 60 })
    },
    title() {
      return `Created by ${this.author}, ${this.truncatedText}`;
    },
    author() {
      if (!this.isCloud) {
        return "You";
      }
      if (!this.item || !this.item.membership) {
        return "Unknown";
      }
      if (this.item.membership.userId === this.workspace.currentMembership.userId) {
        return "You";
      }
      return this.item.membership.name;
    },
    subtitle() {
      const result = []
      if (this.item.user?.name) result.push(`${this.item.user.name}`)
      if (this.item.updatedAt) {
        if (_.isNumber(this.item.updatedAt)) {
          result.push(this.timeAgo.format(new Date(this.item.updatedAt * 1000)))
        } else {
          result.push(this.timeAgo.format(this.item.updatedAt))
        }
      }
      return result.join(" ")
    },
    folder() {
      return this.folders.find((f) => f.id === this.item.queryFolderId);
    },
    isPersonal() {
      return this.folder?.personal;
    },
  },
  methods: {
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
          name: "View Edit History",
          handler: ({ item }) => this.$emit('open-history', item)
        },
        { type: 'divider' },
        {
          name: "Share",
          slug: 'share',
          handler: this.share,
          hideIf: !this.isCloud || !this.item.id || this.isPersonal,
        },
        {
          name: "Duplicate",
          handler: ({ item }) => this.$emit('duplicate', item)
        },
        {
          name: "Export",
          handler: ({ item }) => this.$emit('export', item)
        },
        { type: 'divider' },
        {
          name: "Rename",
          handler: () => {
            this.rename = true;
          },
          hideIf: !canWrite,
        },
        {
          name: "Move",
          handler: () => {
            this.trigger(AppEvent.openMoveFileModal, {
              type: "query",
              value: this.item,
            })
          },
          hideIf: this.folders.length === 0,
        },
        {
          name: "Delete",
          handler: ({ item }) => this.$emit('remove', item)
        },
      ].filter(({ hideIf }) => !hideIf)

      this.$bks.openMenu({
        item, event,
        options
      })
    },
    share() {
      this.trigger(AppEvent.openShareModal, {
        id: this.item.id,
        module: "data/queries",
      });
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
  min-width: 0;
}

.list-item-btn .list-text .list-title {
  position: relative;
  width: 100%;
  overflow: visible;
}

/** --depth is from Tree.vue */
.list-group .list-item .list-item-btn {
  padding-left: calc(var(--depth) * 1.2rem);
}

.item-icon {
  margin-left: 0.25rem;
}
</style>
