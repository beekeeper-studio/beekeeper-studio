<template>
<div class="connection-button flex flex-middle" v-if="config" :title="config.fullConnectionString">
  <x-button class="btn btn-link btn-icon" menu>
    <i class="material-icons">check_circle</i>
    <span class="connection-name truncate expand">{{connectionName}}</span>
    <span class="connection-type badge truncate">{{connectionType}}</span>
    <x-menu>
      <x-menuitem @click.prevent="disconnect(false)" class="red">
        <x-label><i class="material-icons">power_settings_new</i>Disconnect</x-label>
      </x-menuitem>
      <x-menuitem @click.prevent="$modal.show('config-save-modal')">
        <x-label v-if="config.id"><i class="material-icons">edit</i>Edit Connection</x-label>
        <x-label v-else><i class="material-icons">save</i>Save Connection</x-label>
      </x-menuitem>
    </x-menu>
  </x-button>

  <modal class="vue-dialog beekeeper-modal save-connection-modal" name="config-save-modal" height="auto" :scrollable="true">
    <div class="dialog-content">
      <div v-if="errors" class="alert alert-danger">
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
  <modal class="vue-dialog beekeeper-modal" name="running-exports-modal" height="auto" :scrollable="true">
    <form @submit.prevent="disconnect(true)">      
      <div class="dialog-content">
        <div class="dialog-c-title">Confirm Disconnect</div>
        There are active exports running. Are you sure you want to disconnect?
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('running-exports-modal')">Cancel</button>
        <button class="btn btn-danger" type="submit">Disconnect</button>
      </div>
    </form>
  </modal>
</div>

</template>
<script>
import { mapState, mapGetters } from 'vuex'
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
      ...mapGetters({'hasRunningExports': 'exports/hasRunningExports'}),
      connectionName() {
        const config = this.config
        if (!config) return 'Connection'
        const name = config.name ? config.name : config.simpleConnectionString
        return name
      },
      connectionType() {
        return `${this.config.connectionType}`
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
    disconnect(force) {
      if (this.hasRunningExports && !force) {
        this.$modal.show('running-exports-modal')
      } else {
        this.$store.dispatch('disconnect')
      }
    }
  }
}
</script>
