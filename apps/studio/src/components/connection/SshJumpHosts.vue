<template>
  <div class="ssh-jump-hosts">
    <div class="ssh-table-header">
      <h5>Connection Steps</h5>
      <button
        class="btn btn-primary btn-fab add-host-btn"
        type="button"
        @click="$emit('add')"
      >
        <i class="material-icons">add</i>
      </button>
    </div>

    <div class="ssh-table-container">
      <div class="empty-text" v-if="sortedConfigs.length === 0">
        No SSH hosts configured. Click the + button to add one.
      </div>
      <div class="ssh-steps">
        <div
          v-for="(join, idx) in sortedConfigs"
          :key="join.position"
          class="host-bullet"
          :title="`SSH Host #${idx + 1}`"
        >
          <div class="bullet" />
          <i
            class="material-icons-outlined arrow"
            style="transform: rotate(180deg)"
          >straight</i>
        </div>
      </div>

      <div class="ssh-list-wrap">
        <draggable
          :value="sortedConfigs"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <div
            v-for="row in rows"
            :key="row.position"
            class="ssh-row"
            :class="{ selected: selectedPosition === row.position }"
            @click="$emit('update:selectedPosition', row.position)"
          >
            <span class="drag-handle" />
            <span class="col-host">
              <span
                class="host"
                :class="{ 'empty': !row.host }"
                v-text="row.host || '<EMPTY>'"
              />
              <span class="port" v-text="`:${row.port}`" />
            </span>
            <span class="col-action">
              <button
                type="button"
                class="btn btn-fab remove-btn"
                @click.stop="$emit('remove', row.position)"
              >
                <i class="material-icons">clear</i>
              </button>
            </span>
          </div>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import Draggable from "vuedraggable";
import FilePicker from "@/components/common/form/FilePicker.vue";
import ExternalLink from "@/components/common/ExternalLink.vue";
import MaskedInput from "@/components/MaskedInput.vue";
import { TransportConnectionSshConfig } from "@/common/transport/TransportSshConfig";
import _ from "lodash";

export default Vue.extend({
  components: { Draggable, FilePicker, ExternalLink, MaskedInput },

  props: {
    sshConfigs: {
      type: Array as PropType<TransportConnectionSshConfig[]>,
      required: true,
    },
    selectedPosition: Number,
  },

  computed: {
    sortedConfigs(): TransportConnectionSshConfig[] {
      return _.sortBy(this.sshConfigs || [], "position");
    },
    rows() {
      const authLabels = {
        keyfile: "Key File",
        userpass: "Password",
        agent: "Agent",
      } as const;
      const configs: TransportConnectionSshConfig[] = this.sortedConfigs;
      return configs.map((config: TransportConnectionSshConfig) => {
        const host = config.sshConfig.host || "";
        const port = config.sshConfig.port;
        const username = config.sshConfig.username || "";
        const auth = authLabels[config.sshConfig.mode] || "";
        return { position: config.position, host, port, username, auth };
      });
    },
  },

  methods: {
    onDragEnd(event: any) {
      const { oldIndex, newIndex } = event;
      if (oldIndex === newIndex) {
        return;
      }
      this.$emit("reorder", { oldIndex, newIndex });
    },
  },
});
</script>

<style lang="scss" scoped>
.ssh-jump-hosts {
  --row-height: 2.14rem;
}

.ssh-table-header {
  margin-block: 0.5rem;
  display: flex;
  align-items: center;

  h5 {
    margin: 0;
  }

  .btn.btn-fab.add-host-btn {
    margin: 0 0 0 auto;
    width: 1.4rem;
    height: 1.4rem;
    min-width: 1.4rem;
    min-height: 1.4rem;

    .material-icons {
      font-size: 1rem;
    }
  }
}

.ssh-table-container {
  display: flex;

  .empty-text {
    font-size: 0.831rem;
    color: var(--text-lighter);
  }
}

.ssh-steps {
  display: flex;
  flex-direction: column;
  width: 1.5rem;
  color: var(--text-lighter);
  margin-top: 3px;

  > * {
    height: var(--row-height);
    display: flex;
    align-items: center;
    position: relative;
    margin-bottom: 3px;

    &.host-bullet {
      position: relative;
      align-items: center;

      .bullet {
        width: 0.65rem;
        height: 0.65rem;
        min-width: 0.65rem;
        min-height: 0.65rem;
        background-color: currentColor;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .arrow {
        position: absolute;
        left: -0.19em;
        top: calc(var(--row-height) / 1.25);
      }
    }

    [class^=material-icons] {
      font-size: 1em;
    }
  }
}

.ssh-list-wrap {
  flex: 1;
  min-width: 0;
}

.ssh-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.831rem;
  background-color: rgb(from var(--theme-base) r g b / 5%);
  border-radius: 5px;
  margin: 3px 0;
  height: var(--row-height);
  color: var(--text-dark);

  &.selected {
    outline: 1px solid var(--input-highlight);
    outline-offset: -1px;
  }

  .col-host {
    flex: 2;
    min-width: 0;
    display: flex;
    align-items: center;
    overflow: hidden;

    .host {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .port {
      flex-shrink: 0;
      white-space: nowrap;
    }

    .empty {
      color: var(--text-lighter);
    }
  }

  .col-action {
    width: 2rem;
    display: flex;
    justify-content: flex-end;
  }

  .drag-handle {
    cursor: move;
    color: var(--text-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.2rem;
    width: 1.5rem;
    height: 100%;

    &:hover {
      background-color: rgb(from var(--theme-base) r g b / 5%);
    }

    &::before {
      content: "";
      height: 60%;
      width: 20%;
      display: block;
      border-inline: 1px solid var(--border-color);
    }
  }
}


.remove-btn {
  margin: 0;
  background-color: transparent;

  &:hover .material-icons {
    color: var(--text-dark);
  }

  i.material-icons {
    color: var(--text-lighter);
    font-size: 1.3em;
  }
}
</style>
