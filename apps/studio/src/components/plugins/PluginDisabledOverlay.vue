<template>
  <div class="disabled-overlay">
    <div class="body">
      <div class="card-flat padding">
        <control-row
          v-if="userCanEnable"
          title="Plugins Disabled"
          description="The plugin system is currently disabled. You must enable it to use plugins. (Restart Required)"
        >
          <x-switch
            @click.prevent="pluginsEnabled = !pluginsEnabled"
            :toggled="pluginsEnabled"
          />
        </control-row>
        <div v-else>
          The plugin system has been disabled by your system administrator. Contact them to enable plugin use.
        </div>
        <a href="https://docs.beekeeperstudio.io/user_guide/plugins/" class="">Learn more</a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Noty from 'noty'
import ControlRow from "@/components/common/ControlRow.vue";

export default Vue.extend({
  components: { ControlRow },
  data() {
    return {
      notif: new Noty({
        text: 'Restart required to properly initialize the plugin system.',
        layout: 'bottomRight',
        timeout: false,
        closeWith: ['button'],
        buttons: [
          Noty.button('Later', 'btn btn-flat', () => {
            // @ts-ignore
            this.notif.close();
          }),
          Noty.button('Restart Now', 'btn btn-primary', window.main.triggerRestart)
        ]
      })
    }
  },
  computed: {
    userCanEnable(): boolean {
      return this.$bksConfig.userCanOverride("pluginSystem.disabled")
    },
    pluginsEnabled: {
      get() {
        return !this.$bksConfig.pluginSystem.disabled;
      },
      async set(value) {
        await this.$util.send('config/writeUserValue', { path: 'pluginSystem.disabled', value: !value });
        this.notif.show()
      }
    }
  }
})
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

.disabled-overlay {
  position: absolute;
  z-index: 999;
  /* This is so it actually covers the side/bottom padding */
  inset: 0 -1.2rem -0.8rem;
  backdrop-filter: blur(6px);
  background-color: rgba($theme-bg, 0.5);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .body {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
}
</style>
