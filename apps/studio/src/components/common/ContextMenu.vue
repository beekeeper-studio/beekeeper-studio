<template>
<!-- Original file souce copyright John Datserakis https://github.com/johndatserakis/vue-simple-context-menu -->
  <div>
    <portal to="menus">
      <ul
        :id="elementId"
        class="vue-simple-context-menu"
        ref="ul"
      >
      <slot />
        <li
          v-for="(option, index) in options"
          :key="index"
          @click.stop="optionClicked(option)"
          class="vue-simple-context-menu__item"
          :class="[option.class, (option.type === 'divider' ? 'vue-simple-context-menu__divider' : '')]"
        >
          <span v-html="option.name"></span>
        </li>
      </ul>
    </portal>
  </div>
</template>

<script>

import Vue from 'vue'

export default {
  name: 'ContextMenu',
  props: ['elementId', 'options', 'triggerEvent'],
  data () {
    return {
      item: null,
      menuWidth: null,
      menuHeight: null,
      menuOpen: false,
    }
  },
  watch: {
    triggerEvent() {
      if (this.triggerEvent) {
        const { item, event } = this.triggerEvent
        console.log("opening menu")
        this.showMenu(event, item)
      }
    },
  },

  computed: {
    outsideOptions() {
      const userProvided = this.clickOutsideOptions || {}
      return { ...this.defaultOutsideOptions, ...userProvided, handler: this.onClickOutside}
    },
    menuElements() {
      if (this.$refs.ul) {
        return Array.from(this.$refs.ul.getElementsByTagName("*"))
      } else {
        return []
      }
    }
  },
  methods: {
    showMenu (event, item) {
      this.item = item

      var menu = document.getElementById(this.elementId)
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
    hideContextMenu () {
      this.menuOpen = false
      let element = document.getElementById(this.elementId)
      if (element) {
        element.classList.remove('vue-simple-context-menu--active');
      }
    },
    onClickOutside () {
      console.log("Click outside!")
      this.hideContextMenu()
    },
    optionClicked (option) {
      this.hideContextMenu()
      this.$emit('option-clicked', {
        item: this.item,
        option: option
      })
    },
    onEscKeyRelease (event) {
      if (event.keyCode === 27) {
        this.hideContextMenu();
      }
    },
    maybeHideMenu(event) {
      if (this.menuOpen) {
        const target = event.target
        if (!this.menuElements.includes(target)) {
          this.hideContextMenu()
        }
      }
    }
  },
  mounted () {
    document.addEventListener('keyup', this.onEscKeyRelease);
    document.addEventListener('mousedown', this.maybeHideMenu)
  },
  beforeDestroy () {
    document.removeEventListener('mousedown', this.maybeHideMenu)
    document.removeEventListener('keyup', this.onEscKeyRelease);
  }
}
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
