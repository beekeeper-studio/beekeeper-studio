<template>
  <div class="sidebar-wrap flex-col">
    <div class="sidebar-heading">
      <div class="status connected sidebar-title row flex-middle noselect">
        <span>Saved Connections</span>
      </div>
    </div>
    <nav class="list-group expand">
      <div class="list-item">
        <a
          href=""
          class="list-item-btn"
          v-for="c in connectionConfigs"
          :key="c.id"
          :class="{'active': c == selectedConfig,  }"
          @click.prevent="edit(c)"
          @dblclick.prevent="connect(c)"
        >
          <span :class="`connection-label connection-label-color-${c.labelColor}`"></span>
          <span class="title expand">{{c.name}} </span>
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
    </nav>
    <div class="btn-wrap quick-connect">
      <a
        href=""
        class="btn btn-flat btn-icon btn-block"
        :class="{'active': defaultConfig == selectedConfig }"
        @click.prevent="edit(defaultConfig)"
      >
      <i class="material-icons">offline_bolt</i>
      <span>Quick Connect</span>
      </a>
    </div>
  </div>
</template>

<script>
  export default {
    props: ['defaultConfig', 'selectedConfig'],
    computed: {
      connectionConfigs() {
        return this.$store.state.connectionConfigs
      }
    },
    methods: {
      edit(config) {
        this.$emit('edit', config)
      },
      connect(config) {
        this.$emit('connect', config)
      },
      remove(config) {
        this.$emit('remove', config)
      },
      getLabelClass(color) {
        return `label-${color}`
      }
    }
  }
</script>
