<template>
  <span :style="{ 'display': 'none' }">
    <mounting-portal
      v-if="!!selector"
      :mount-to="selector"
      append
    >
      <transition name="slideover">
        <div
          v-if="open"
          class="slideover"
        >
          <x-progressbar v-if="loading && open">
          </x-progressbar>
          <div class="slideover-header">
            <a
              href="#"
              class="slideover-back"
              @click.prevent="close"
            >
              <i class="material-icons">arrow_back</i>
            </a>
            <slot name="title" :close="close" />
          </div>
          <div class="slideover-body">
            <slot/>
          </div>
          <div class="slideover-footer" v-if="$scopedSlots.footer">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </transition>
    </mounting-portal>
  </span>
</template>

<script lang="ts">
import Vue from 'vue';
import { MountingPortal } from 'portal-vue';
import { uuidv4 } from '@/lib/uuid';

export default Vue.extend({
  components: { MountingPortal },
  data() {
    return {
      open: false,
      selector: null
    }
  },
  props: {
    // custom mounting selector, eg. `#id`, takes precendence over mountToNearest
    mountingSelector: {
      type: String,
      default: null,
    },
    // use js to mount to the nearest `.selector`, will assign an id if
    // not present, used for generated content like modals
    // defaults to taking over a modal
    mountToNearest: {
      type: String,
      default: ".v--modal-box"
    },
    loading: Boolean
  },
  computed: {
  },
  methods: {
    show() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    setSelector() {
      if (this.mountingSelector) {
        this.selector = this.mountingSelector
        return;
      }

      if (this.mountToNearest && this.$el) {
        const box = (this.$el as HTMLElement).closest<HTMLElement>(this.mountToNearest);
        if (box) {
          if (!box.id) {
            box.id = `bks-slideover-host-${uuidv4()}`
          }
          this.selector = `#${box.id}`;
        }
      }
    }
  },
  async mounted() {
    this.setSelector();
  }
})
</script>

<style lang="scss" scoped>
.slideover {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
}

.slideover-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 1.2rem;
  padding-block: 0.8rem;
}

.slideover-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 1.8rem;
  color: var(--text-dark);
  transition: background 0.15s ease-in-out;

  &:hover,
  &:focus {
    background: rgb(from var(--theme-base) r g b / 10%);
  }

  .material-icons {
    font-size: 1.25rem;
  }
}

.slideover-title {
  font-size: 1.1rem;
  font-weight: 500;
}

.slideover-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 1.2rem 0.8rem;
}

.slideover-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-inline: 1.2rem;
  padding-bottom: 0.8rem;
}
.slideover-enter-active,
.slideover-leave-active {
  transition: transform 0.25s ease;
}

.slideover-enter,
.slideover-leave-to {
  transform: translateX(100%);
}
</style>
