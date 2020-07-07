<template>
  <div class="list-item">
    <a
      href=""
      class="list-item-btn"
      :class="{'active': selectedConfig && savedConnection.id === selectedConfig.id }"
      @click.prevent="click(config)"
      @dblclick.prevent="doubleClick(config)"
    >
      <span :class="`connection-label connection-label-color-${labelColor}`"></span>
      <span class="title expand" :title="c.title">{{label}} </span>
      <span class="badge"><span>{{c.connectionType}}</span></span>
      <x-button class="btn-fab" skin="iconic">
        <i class="material-icons">more_horiz</i>
        <x-menu style="--target-align: right; --v-target-align: top;">
          <x-menuitem @click.prevent.stop="remove(c)">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-button>
    </a>
  </div>
</template>
<script>
import path from 'path'
export default {
  // recent list is 'recent connections'
  // if that is true, we need to find the companion saved connection
  props: ['config', 'isRecentList', 'selectedConfig'],
  computed: {
    labelColor() {
      return this.savedConnection.labelColor || 'default'
    },
    label() {
      if (this.savedConnection) {
        return this.savedConnection.name
      }
      if (this.config.connectionType === 'sqlite') {
        return path.basename(this.config.defaultDatabase)
      } else {
        return this.config.simpleConnectionString
      }
      
    },
    title() {
      return this.config.title
    },
    savedConnection() {

      if (this.isRecentList) {
        if (!this.config.savedConnectionId) return {}
        return this.$store.state.connectionConfigs.find(c => c.id === this.config.savedConnectionId)
      } else {
        return this.config
      }
    }
  },
  methods: {
    click() {
      this.$emit('click', this.config)
    },
    doubleClick() {
      this.$emit('doubleClick', this.config)
    },
    remove() {
      this.$emit('remove', this.config)
    }
  }

}
</script>