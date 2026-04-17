
<template>
  <nav
    class="flyout-nav"
    v-hotkey="allHotkeys"
    :class="{active: menuActive}"
    ref="nav"
    tabindex="-1"
    role="menubar"
    @keydown="maybeCaptureKeydown"
  >
    <!-- TOP MENU, eg File, Edit -->
    <ul class="menu-bar">
      <li
        @mouseover.prevent="setSelected(menu)"
        @dblclick.stop="noop()"
        @mouseleave.prevent="unselect(menu)"
        class="top-menu-item"
        :class="{selected: menu === selected}"
        v-for="menu in menus"
        :key="menu.label"
      >
        <a
          :class="{selected: menu === selected}"
          @mousedown.prevent="setActive(menu)"
        ><span class="label">{{ menu.label }}</span></a>
        <!-- FIRST LEVEL MENU, eg New Window, New Tab -->
        <ul>
          <li
            class="menu-item"
            :class="{'has-children': !!item.submenu, ...hoverClass(item), 'disabled-app-menu': isMenuItemDisabled(item.id)}"
            v-for="(item, idx) in visibleSubmenuItems(menu)"
            :key="item.id || idx"
          >
            <div v-if="item.type === 'separator'" class="separator" />
            <a
              v-else
              @mousedown.prevent="noop()"
              @mouseup.prevent="handle(item)"
              @mouseover.prevent="setHover(item)"
              :class="hoverClass(item)"
            >
              <span class="label">
                <span
                  class="material-icons"
                  v-if="item.checked"
                >done</span>
                <span>{{ item.label }}</span>
              </span>
              <span class="shortcut">{{ shortcutText(item) }}</span>
            </a>
            <!-- Second Level Menu, eg Dark Theme, Light Theme -->
            <ul v-if="item.submenu">
              <li
                class="menu-item"
                v-for="subitem in (item.submenu || [])"
                :key="subitem.label"
              >
                <div v-if="item.type === 'separator'" class="separator" />
                <a
                  v-else
                  @mouseover.prevent="setHover(subitem, item)"
                  :class="hoverClass(subitem)"
                  @mousedown.prevent="noop()"
                  @mouseup.prevent="handle(subitem)"
                >
                  <span class="label">
                    <span
                      class="material-icons"
                      v-if="subitem.checked"
                    >done</span>
                    <span>{{ subitem.label }}</span>
                  </span>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script>
import _ from 'lodash'
import ClientMenuActionHandler from '../../lib/menu/ClientMenuActionHandler'
import MenuBuilder from '../../common/menus/MenuBuilder'
import { mapGetters, mapState } from 'vuex'


export default {
  components: { },
  props: [],
  data() {
    return {
      menuBuilder: null,
      actionHandler: new ClientMenuActionHandler(),
      menuActive: false,
      selected: null,
      hovered: null,
      hoveredParent: null,
      navigationKeys: {
        "ArrowUp": this.moveUp,
        "ArrowDown": this.moveDown,
        "ArrowLeft": this.moveLeft,
        "ArrowRight": this.moveRight,
        "Escape": this.closeMenu,
        "Enter": this.clickHovered
      },
    }
  },
  computed: {
    allHotkeys() {
      const result = {}
      this.menus.forEach(menu => {
        menu.submenu?.forEach(item => {
          if (item.accelerator && item.click) {
            const shortcut = this.shortcut(item)
            if (shortcut)
              result[shortcut] = item.click
          }
        })
      })
      return result
    },
    menuElements() {
      return Array.from(this.$refs.nav.getElementsByTagName("*"))
    },
    ...mapGetters('menuBar', ['menus', 'connectionMenuItems']),
    ...mapState(['connected'])
  },
  watch: {
    menuActive() {
      if (!this.menuActive) {
        this.selected = null
        this.hovered = null
        this.hoveredParent = null
        this.$store.dispatch('menuActive', false)
      } else {
        this.$store.dispatch('menuActive', true)
      }
    }
  },
  methods: {
    isMenuItemDisabled(itemId){
      return this.connectionMenuItems.includes(itemId) && !this.connected;
    },
    visibleSubmenuItems(menu) {
      return (menu.submenu || []).filter(item => item.visible !== false);
    },
    getNext(array, item) {
      const selectedIndex = item ? _.indexOf(array, item) : -1
      const newIndex = selectedIndex >= array.length -1 ? 0 : selectedIndex + 1
      return array[newIndex]
    },
    getPrevious(array, item) {
      const selectedIndex = item ? _.indexOf(array, item) : array.length
      const newIndex = selectedIndex <= 0 ? array.length - 1 : selectedIndex - 1
      return array[newIndex]
    },
    maybeCaptureKeydown(e) {

      if (!this.menuActive || !this.selected) return

      e.preventDefault()
      const func = this.navigationKeys[e.key]
      return func && func(e)
    },
    moveUp(e) {
      if (!this.menuActive && !this.selected) {
        return
      }
      e.preventDefault()
      const selected = this.hoveredParent || this.selected
      this.hovered = this.getPrevious(selected.submenu, this.hovered)
    },
    moveDown(e) {
      if (!this.menuActive && !this.selected) {
        return
      }
      e.preventDefault()
      const selected = this.hoveredParent || this.selected
      this.hovered = this.getNext(selected.submenu, this.hovered)
    },
    moveRight(e) {
      if (!this.selected) {
        return
      }
      e.preventDefault()
      // if top menu selected, change top menu
      if (!this.hovered || !this.hovered.submenu) {
        this.selected = this.getNext(this.menus, this.selected)
        return
      }

      if (this.hovered && this.hovered.submenu) {
        this.setHover(this.hovered.submenu[0], this.hovered)
      }
    },
    moveLeft(e) {
      if (!this.selected) {
        return
      }
      e.preventDefault()
      // if top menu selected, change top menu
      if (!this.hovered || !this.hoveredParent) {
        this.selected = this.getPrevious(this.menus, this.selected)
        return
      }

      if (this.hoveredParent) {
        this.setHover(this.hoveredParent)
      }
    },
    closeMenu(e) {
      this.menuActive = false
      e.preventDefault()
    },
    clickHovered() {
      this.handle(this.hovered)
    },
    hoverClass(item) {
      return {hovered: [this.hovered, this.hoveredParent].includes(item)}
    },
    shortcutText(item) {
      if (!item.accelerator) return ""
      const meta = this.$config.isMac ? 'Cmd' : 'Ctrl'
      return item.accelerator.replace('CommandOrControl', meta)
    },
    shortcut(item) {
      if (!item.click || !item.accelerator || item.registerAccelerator === false) return null
      const ctrlKey = this.$config.isMac ? 'meta' : 'ctrl'
      return item.accelerator
        .replace('CommandOrControl', ctrlKey)
        .replace('Plus', 'numpad +')
        .toLowerCase()
    },
    setActive(item) {
      this.menuActive = !this.menuActive
      this.selected = item
      this.$nextTick(() => this.$refs.nav?.focus())
    },
    setSelected(item) {
      this.selected = item
    },
    unselect(item) {
      if (!this.menuActive && this.selected === item) this.selected = null
    },
    setHover(item, parent) {
      this.hovered = item
      this.hoveredParent = parent
    },
    maybeHideMenu(event) {
      if (this.menuActive) {
        const target = event.target
        if (!this.menuElements.includes(target)) {
          this.menuActive = false
        }
      }
    },
    handle(item) {
      if (item.click && !item.submenu) {
        item.click(item.label)
        this.menuActive = false
      }
    },
    noop() {
      // Empty on purpose
    }
  },
  async mounted() {
    document.addEventListener('click', this.maybeHideMenu)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.maybeHideMenu)
  }


}
</script>

<style scoped>
.separator {
  margin-block: 0.35em;
  width: 100%;
  width: 100%;
  border-bottom: 1px solid var(--border-color);
}
</style>
