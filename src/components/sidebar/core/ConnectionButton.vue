<template>
<div v-if="config">
  <x-button menu>
    <x-label class="truncate">{{connectionName}}</x-label>
    <x-menu>
      <x-menuitem @click.prevent="disconnect" class="red">
        <x-label>Disconnect</x-label>
      </x-menuitem>
      <x-menuitem @click.prevent="$modal.show('config-save-modal')">
        <x-label v-if="config.id">Edit Connection</x-label>
        <x-label v-else>Save Connection</x-label>
      </x-menuitem>
    </x-menu>
  </x-button>

  <modal class="vue-dialog beekeeper-modal" name="config-save-modal" height="auto" :scrollable="true">
    <div class="dialog-content">
      <div v-if="errors" class="alart alert-danger">
        <i class="material-icons">warning</i>
        <div>
          <span>Please fix the following errors:</span>
          <ul>
            <li v-for="(e, i) in errors" :key="i">{{e}}</li>
          </ul>
        </div>
      </div>
      <SaveConnectionForm :selectInput="true" @cancel="$modal.hide('config-save-modal')" :canCancel="true" :config="config" @save="save"></SaveConnectionForm>
    </div>
  </modal>
</div>

</template>
<script>
import { mapState } from 'vuex'
import SaveConnectionForm from '../../connection/SaveConnectionForm'
export default {
  components: {
    SaveConnectionForm
  },
  data() {
    return {
      errors: null
    }
  },
  computed: {
      ...mapState({'config': 'usedConfig'}),
      connectionName() {
        const config = this.config
        if (!config) return 'Connection'
        const name = config.name ? config.name : 'Connection'
        return `${name} (${config.connectionType})`
      }
  },
  methods: {

    async save() {
      try {
        this.errors = null
        await this.$store.dispatch('saveConnectionConfig', this.config)
        this.$modal.hide('config-save-modal')
        this.$noty.success("Connection Saved")
      } catch (error) {
        this.errors = [error.message]
      }

    },
    disconnect() {
      this.$store.dispatch('disconnect')
    }
  }  
}
</script>