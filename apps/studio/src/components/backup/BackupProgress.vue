<template>
  <div class="backup-wrapper scrollable">
    <div class="backup-header">
      <h2>
        {{ isRestore ? $t('Restore') : $t('Backup') }} {{ $t('Progress') }}
      </h2>
    </div>
    <div class="backup-log">
      <div class="beekeeper-log">
        <div class="title">
          {{ $t('Backup started') }}
        </div>
        <div class="content">
          {{ commandStart }}
        </div>
      </div>
      <div
        v-if="commandEnd != null"
        class="beekeeper-log"
      >
        <div class="title">
          {{ $t('Backup ended') }}
        </div>
        <div class="content">
          {{ commandEnd }}
        </div>
      </div>
      <div
        v-if="elapsedTime != null"
        class="beekeeper-log"
      >
        <div class="title">
          {{ $t('Time elapsed') }}
        </div>
        <div class="content">
          {{ elapsedTime }}ms
        </div>
      </div>

      <div class="system-logs">
        <h3 class="flex">
          <span class="expand">{{ $t('Logs (last 100 lines)') }}</span>
          <x-buttons>
            <x-button
              @click.prevent="$emit('openLog')"
              class="btn btn-flat btn-small"
            >
              <x-label>{{ $t('Open Log File') }}</x-label>
            </x-button>
            <x-button
              class="btn btn-flat btn-small"
              menu
            >
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="() => $emit('openLog')">
                  <x-label>{{ $t('Open Log File') }}</x-label>
                </x-menuitem>
                <x-menuitem @click.prevent="() => $emit('showLog')">
                  <x-label>{{ $t('Show In Folder') }}</x-label>
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </h3>
        <div
          v-if="!expanded"
          class="last-log"
        >
          <div
            class="expand-button"
            @click="expanded = !expanded"
          >
            <i class="material-icons">arrow_right</i>
          </div>
          <span v-if="logMessages.length > 0">{{ logMessages[logMessages.length - 1] }}</span>
          <span v-else>{{ $t('The command has not outputted any logs') }}</span>
        </div>
        <div
          class="log-messages"
          v-else
        >
          <div
            class="expand-button"
            @click="expanded = !expanded"
          >
            <i class="material-icons">arrow_drop_down</i>
          </div>
          <div class="log-content-wrapper">
            <p
              class="log"
              v-for="(log, index) of logMessages"
              :key="index"
            >
              {{ log }}
            </p>
          </div>
          <div
            v-if="logMessages.length == 0"
            class="log"
          >
            {{ $t('The command has not outputted any logs') }}
          </div>
        </div>
        <div v-if="failed">
          <button
            @click="$emit('retry')"
            class="btn btn-primary"
          >
            {{ $t('Retry') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';


export default Vue.extend({
  props: ['failed'],
  data() {
    return {
      expanded: false
    }
  },
  computed: {
    ...mapState('backups', {
      'logMessages': 'logMessages',
      'commandStart': 'commandStart',
      'commandEnd': 'commandEnd',
      'isRestore': 'isRestore'
    }),
    elapsedTime() {
      if (!this.commandStart || !this.commandEnd) return null;

      return this.commandEnd.getTime() - this.commandStart.getTime();
    },
  }
})
</script>

<style scoped="true" lang="scss">
  .last-log {
    margin-bottom: 1rem;
  }

  .log-messages {
    margin-bottom: 1rem;
    .log {
      user-select: text;
    }
  }
  
  .log-content-wrapper {
    white-space: nowrap;
    max-height: 400px;
    overflow: auto;
  }

</style>
