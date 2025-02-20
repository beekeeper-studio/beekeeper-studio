<template>
  <!-- Original file souce copyright John Datserakis https://github.com/johndatserakis/vue-simple-context-menu -->
  <div class="BksContextMenu-list-wrapper">
    <ul
      class="BksContextMenu-list vue-simple-context-menu"
      ref="menu"
    >
      <li
        v-for="(option, index) in options"
        :key="index"
        @click="optionClicked(option, index, $event)"
        class="BksContextMenu-item vue-simple-context-menu__item"
        :class="[typeof option.class === 'function' ? option.class({ item }) : option.class, (option.type === 'divider' ? 'vue-simple-context-menu__divider' : ''), option.disabled ? 'disabled' : '']"
        ref="item"
      >
        <span v-html="option.name" />
        <span>
          <span
            class="shortcut"
            v-if="option.shortcut"
            v-text="option.shortcut"
          />
          <i
            class="material-icons menu-icon"
            v-if="option.icon"
          >{{ option.icon }}</i>
        </span>
      </li>
    </ul>
    <context-menu v-if="showSubItemsIndex !== -1" :options="options[showSubItemsIndex].items" :item="item" :event="event" :parentMenu="$refs.item[showSubItemsIndex]" @close="$emit('close')" />
  </div>
</template>

<script lang="ts">
import { MenuItem } from './menu'
import Vue from 'vue'

export default Vue.extend({
  name: 'ContextMenu',
  props: ['options', 'event', 'item', 'parentMenu'],
  data() {
    return {
      menuWidth: null,
      menuHeight: null,
      menuOpen: false,
      showSubItemsIndex: -1,
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

      const { left, top } = this.calculatePosition(event)
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.classList.add('vue-simple-context-menu--active')
      this.menuOpen = true
    },
    calculatePosition(event: MouseEvent): { left: number, top: number } {
      let left = 0;
      let top = 0;

      const isSubItem = this.parentMenu

      if (isSubItem) {
        const parentClientRect = this.parentMenu.getBoundingClientRect()

        if ((this.menuWidth + parentClientRect.right) >= window.innerWidth) {
          left = parentClientRect.left - 2 - this.menuWidth
        } else {
          left = parentClientRect.right + 2
        }

        if ((this.menuHeight + parentClientRect.bottom) >= window.innerHeight) {
          top = parentClientRect.bottom - this.menuHeight
        } else {
          top = parentClientRect.top
        }

        return { left, top }
      }

      if ((this.menuWidth + event.pageX) >= window.innerWidth) {
        left = event.pageX - this.menuWidth + 2
      } else {
        left = event.pageX - 2
      }

      if ((this.menuHeight + event.pageY) >= window.innerHeight) {
        top = event.pageY - this.menuHeight + 2
      } else {
        top = event.pageY - 2
      }

      return { left, top }
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
    optionClicked(option: MenuItem, idx: number, event: any) {
      if (option.items?.length > 0 && this.showSubItemsIndex === idx) {
        return
      }
      if (option.disabled) return;
      option.handler?.({ item: this.item, option, event })
      if (option.items?.length > 0) {
        this.showSubItemsIndex = idx
      } else {
        this.hideContextMenu()
      }
    },
    onEscKeyRelease(event) {
      if (event.keyCode === 27) {
        this.hideContextMenu();
      }
    },
  },
  mounted() {
    this.showMenu(this.event, this.item)
  },
})
</script>

<!-- <style lang="scss"> -->
<!-- // yuck -->
<!-- $light-grey: #ecf0f1; -->
<!-- $grey: darken($light-grey, 15%); -->
<!-- $blue: #007aff; -->
<!-- $white: #fff; -->
<!-- $black: #333; -->
<!--  -->
<!-- .vue-simple-context-menu { -->
<!--   top: 0; -->
<!--   left: 0; -->
<!--   margin: 0; -->
<!--   padding: 0; -->
<!--   display: none; -->
<!--   list-style: none; -->
<!--   position: absolute; -->
<!--   z-index: 1000000; -->
<!--   background-color: $light-grey; -->
<!--   border-bottom-width: 0px; -->
<!--   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", -->
<!--     "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", -->
<!--     sans-serif; -->
<!--   box-shadow: 0 3px 6px 0 rgba($black, 0.2); -->
<!--   border-radius: 4px; -->
<!--  -->
<!--   &--active { -->
<!--     display: block; -->
<!--   } -->
<!--  -->
<!--   &__item { -->
<!--     display: flex; -->
<!--     color: $black; -->
<!--     cursor: pointer; -->
<!--     padding: 5px 15px; -->
<!--     align-items: center; -->
<!--  -->
<!--     &:hover { -->
<!--       background-color: $blue; -->
<!--       color: $white; -->
<!--     } -->
<!--   } -->
<!--  -->
<!--   &__divider { -->
<!--     box-sizing: content-box; -->
<!--     height: 2px; -->
<!--     background-color: $grey; -->
<!--     padding: 4px 0; -->
<!--     background-clip: content-box; -->
<!--     pointer-events: none; -->
<!--   } -->
<!--  -->
<!--   // Have to use the element so we can make use of `first-of-type` and -->
<!--   // `last-of-type` -->
<!--   li { -->
<!--     &:first-of-type { -->
<!--       margin-top: 4px; -->
<!--     } -->
<!--  -->
<!--     &:last-of-type { -->
<!--       margin-bottom: 4px; -->
<!--     } -->
<!--   } -->
<!-- } -->
<!-- </style> -->
