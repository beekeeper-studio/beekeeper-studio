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
    <ai-server-status-button />
    <core-account-button v-if="$store.state.workspaceId > 0" />
  </div>
</template>

<script>
  import CoreAccountButton from './core/CoreAccountButton.vue'
  import AiServerStatusButton from '@/components/aiServer/AiServerStatusButton.vue'
  export default {
    props: ['activeItem'],
    components: { CoreAccountButton, AiServerStatusButton },
  }
</script>
