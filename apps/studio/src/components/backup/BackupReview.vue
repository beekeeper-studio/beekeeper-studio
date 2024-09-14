<template>
  <div class="backup-wrapper small-wrap">
    <h2 class="backup-header">
      Review Command(s)
    </h2>
    <div class="backup-content">
      <div class="review-container">
        <div class="card card-flat padding text-center">
          <div class="command-note">
            Beekeeper Studio will execute the following command. If you would prefer to run the backup yourself, you can copy the command to the clipboard.
          </div>
          <button
            @click.prevent="$emit('finish')"
            class="btn btn-primary"
          >
            <span>Execute {{ isRestore ? 'Restore' : 'Backup' }}</span>
          </button>
        </div>
        <div
          v-for="(command, index) of commands"
          :key="index"
          class="command"
        >
          {{ command }}
          <button
            class="copy-button"
            @click="copyCommand(command)"
          >
            <i class="material-icons">content_copy</i>
          </button>
        </div>
        <div class="command-note info-alert alert text-info">
          <div class="alert-body">
            Some arguments are provided as environment variables on execution for security purposes (eg. password).
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Command } from '@/lib/db/models';
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default Vue.extend({
  data() {
    return {
    }
  },
  computed: {
    ...mapGetters('backups', {
      'client': 'commandClient',
      'isRestore': 'isRestore'
    }),
    commands() {
      let command: Command = this.client.buildCommand();
      let commands: string[] = [`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`];

      while (command.postCommand) {
        command = command.postCommand;

        commands.push(`${command.mainCommand} ${command.options ? command.options.join(' ') : ''}`);
      }

      return commands;
    }
  },
  methods: {
    copyCommand(command: string) {
      this.$native.clipboard.writeText(command);
    }
  }
})
</script>

<style></style>
