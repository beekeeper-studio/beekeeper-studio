<template>
  <div class="global-items">
    <a
      href=""
      @click.prevent="$emit('select', 'tables')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'tables'}"
      title="Database"
    >
      <span class="bk-database" />
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'queries')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'queries'}"
      title="Saved Queries"
    >
      <span class="material-icons">code</span>
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'history')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'history'}"
      title="Run History"
    >
      <span class="material-icons">history</span>
    </a>
    <span class="expand" />
    <x-button
      class="nav-item selectable"
      :class="{ authorized }"
      v-tooltip="authorized ? 'Authorized clients' : 'No authorized clients'"
      menu
    >
      <span class="material-icons-outlined">settings_remote</span>
      <x-menu>
        <x-menuitem
          v-for="client in clients"
          :key="client.name"
        >
          <x-label>{{ client.name }}</x-label>
        </x-menuitem>
        <x-menuitem
          v-if="!clients.length"
          disabled
        >
          <x-label>No authorized clients</x-label>
        </x-menuitem>
        <hr>
        <x-menuitem @click.prevent="openCliConfig">
          <x-label>Settings</x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
    <core-account-button v-if="$store.state.workspaceId > 0" />
  </div>
</template>

<script>
  import { mapActions, mapGetters, mapState } from "vuex";
  import { AppEvent } from "@/common/AppEvent";
  import CoreAccountButton from './core/CoreAccountButton.vue'
  export default {
    props: ['activeItem'],
    data() {
      return {
        grantsListenerId: null,
      };
    },
    computed: {
      ...mapState("cli", ["clients"]),
      ...mapGetters("cli", ["authorized"]),
    },
    mounted() {
      this.loadClients();
      this.grantsListenerId = this.$util.addListener(
        "cli/grantsChanged",
        this.loadClients
      );
    },
    beforeDestroy() {
      this.$util.removeListener(this.grantsListenerId);
    },
    methods: {
      ...mapActions("cli", ["loadClients"]),
      openCliConfig() {
        this.trigger(AppEvent.openCliConfig);
      },
    },
    components: { CoreAccountButton },
  }
</script>
