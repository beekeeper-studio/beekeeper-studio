<template>
  <portal to="modals">
    <modal
      :name="name"
      @before-open="$emit('before-open', $event)"
      @opened="$emit('opened')"
      @closed="$emit('closed')"
      class="base-modal-root"
    >
      <div v-kbd-trap="true" class="base-modal">
        <div class="base-modal-header">
          <div class="base-modal-title">
            <slot name="title" :close="close" />
          </div>
          <a
            href="#"
            class="base-modal-close"
            @click.prevent="close"
          >
            <i class="material-icons">clear</i>
          </a>
        </div>
        <div class="base-modal-body">
          <slot :close="close" />
        </div>
        <div class="base-modal-footer" v-if="$slots.footer">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  methods: {
    close() {
      this.$modal.hide(this.name);
    },
  },
});
</script>

<style scoped>
.base-modal-root ::v-deep .v--modal {
  min-height: 6rem;
  max-width: 550px;
}

.base-modal {
  display: flex;
  flex-direction: column;
}

.base-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding-inline: 1.2rem;
  padding-block: 0.8rem;
}

.base-modal-title {
  font-size: 1.1rem;
  line-height: 1;
  font-weight: 500;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ::v-deep i.material-icons {
    font-size: 1.1rem;
  }
}

.base-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  min-width: 1.8rem;
  height: 1.8rem;
  line-height: 1.8rem;
  border-radius: 1.8rem;
  padding: 0;
  margin: 0;
  margin-right: -0.15em;
  box-shadow: none;
  user-select: none;
  transition: background 0.15s ease-in-out;
}

.base-modal-close:hover,
.base-modal-close:focus {
  background: rgb(from var(--theme-base) r g b / 10%);
}

.base-modal-close .material-icons,
.base-modal-close .material-icons-outlined {
  font-size: 1.25rem;
  color: var(--text-dark);
}

.base-modal-body {
  flex: 1 0 auto;
  width: 100%;
  padding: 0 1.2rem 0.8rem;
}

.base-modal-footer {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: flex-end;
  padding-inline: 1.2rem;
  padding-bottom: 0.8rem;
}
</style>
