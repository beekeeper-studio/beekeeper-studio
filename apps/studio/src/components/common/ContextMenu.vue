<template>
  <!-- Original file souce copyright John Datserakis https://github.com/johndatserakis/vue-simple-context-menu -->
  <div>
    <portal to="menus">
      <ul
        class="vue-simple-context-menu"
        ref="menu"
      >
        <li
          v-for="(option, index) in options"
          :key="index"
          @click.stop="optionClicked(option, $event)"
          class="vue-simple-context-menu__item"
          :class="[typeof option.class === 'function' ? option.class({ item }) : option.class, (option.type === 'divider' ? 'vue-simple-context-menu__divider' : '')]"
        >
          <span v-html="option.name" />
          <div class="expand" />
          <span>
            <span
              class="shortcut"
              v-if="option.shortcut"
              v-html="option.shortcut"
            />
            <i
              class="material-icons menu-icon"
              v-if="option.icon"
            >{{ option.icon }}</i>
            <!-- NOTE (@day): this is supposed to only appear when you don't have an ult license, but this component can't use the store -->
            <i
              v-if="option.ultimate && $store.getters.isCommunity"
              class="material-icons menu-icon"
            >stars</i>
          </span>
        </li>
      </ul>
    </portal>
  </div>
</template>

<script lang="ts">

// NOTE (@day): we can't use the store here for some reason
import { ContextOption } from '@/plugins/BeekeeperPlugin'
import Vue from 'vue'

export default Vue.extend({
  name: 'ContextMenu',
  props: ['options', 'event', 'item'],
  data() {
    return {
      menuWidth: null,
      menuHeight: null,
      menuOpen: false,
    }
  },

  computed: {
    menuElements() {
      if (this.$refs.menu) {
        return Array.from(this.$refs.menu.getElementsByTagName("*"))
      } else {
        return []
      }
    }
  },
  methods: {
    showMenu(event) {

      const menu = this.$refs.menu
      if (!menu) {
        return
      }

      if (!this.menuWidth || !this.menuHeight) {
        menu.style.visibility = "hidden"
        menu.style.display = "block"
        this.menuWidth = menu.offsetWidth
        this.menuHeight = menu.offsetHeight
        menu.removeAttribute("style")
      }

      if ((this.menuWidth + event.pageX) >= window.innerWidth) {
        menu.style.left = (event.pageX - this.menuWidth + 2) + "px"
      } else {
        menu.style.left = (event.pageX - 2) + "px"
      }

      if ((this.menuHeight + event.pageY) >= window.innerHeight) {
        menu.style.top = (event.pageY - this.menuHeight + 2) + "px"
      } else {
        menu.style.top = (event.pageY - 2) + "px"
      }

      menu.classList.add('vue-simple-context-menu--active')
      this.menuOpen = true
    },
    hideContextMenu() {
      this.$emit('close')
      let element = this.$refs.ul
      if (element) {
        element.classList.remove('vue-simple-context-menu--active');
      }
    },
    onClickOutside() {
      this.hideContextMenu()
    },
    optionClicked(option: ContextOption, event: any) {
      option.handler({ item: this.item, option, event })
      this.hideContextMenu()
    },
    onEscKeyRelease(event) {
      if (event.keyCode === 27) {
        this.hideContextMenu();
      }
    },
    maybeHideMenu(event) {
      const target = event.target
      if (!this.menuElements.includes(target)) {
        this.hideContextMenu()
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.showMenu(this.event, this.item)
    })

    document.addEventListener('keyup', this.onEscKeyRelease);
    document.addEventListener('mousedown', this.maybeHideMenu)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeHideMenu)
    document.removeEventListener('keyup', this.onEscKeyRelease);
  }
})
</script>

<style lang="scss">
// yuck
$light-grey: #ecf0f1;
$grey: darken($light-grey, 15%);
$blue: #007aff;
$white: #fff;
$black: #333;

.vue-simple-context-menu {
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
  display: none;
  list-style: none;
  position: absolute;
  z-index: 1000000;
  background-color: $light-grey;
  border-bottom-width: 0px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  box-shadow: 0 3px 6px 0 rgba($black, 0.2);
  border-radius: 4px;

  &--active {
    display: block;
  }

  &__item {
    display: flex;
    color: $black;
    cursor: pointer;
    padding: 5px 15px;
    align-items: center;

    &:hover {
      background-color: $blue;
      color: $white;
    }
  }

  &__divider {
    box-sizing: content-box;
    height: 2px;
    background-color: $grey;
    padding: 4px 0;
    background-clip: content-box;
    pointer-events: none;
  }

  // Have to use the element so we can make use of `first-of-type` and
  // `last-of-type`
  li {
    &:first-of-type {
      margin-top: 4px;
    }

    &:last-of-type {
      margin-bottom: 4px;
    }
  }
}
</style>
