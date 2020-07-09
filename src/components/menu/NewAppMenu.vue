
<template>
<nav class="flyout-nav" v-hotkey="navigationHotkeys"  :class="{active: menuActive}" ref="nav">
  <!-- TOP MENU, eg File, Edit -->
  <ul class="menu-bar">
    <li @mouseover.prevent="setSelected(menu)" @mouseleave.prevent="unselect(menu)" class="top-menu-item" :class="{selected: menu === selected}" v-for="menu in menus" :key="menu.label">
      <a :class="{selected: menu === selected}" @mousedown.prevent="setActive(menu)"><span class="label">{{menu.label}}</span></a>
      <!-- FIRST LEVEL MENU, eg New Window, New Tab -->
      <ul>
        <li v-hotkey="shortcut(item)"  class="menu-item" :class="{'has-children': !!item.submenu, ...hoverClass(item)}" v-for="(item, idx) in menu.submenu" :key="item.id || idx">
          <a @mousedown.prevent="handle(item)" @mouseover.prevent="setHover(item)" :class="hoverClass(item)">
            <span class="label">{{item.label}}</span>
            <span class="shortcut">{{item.accelerator}}</span>
          </a>
          <!-- Second Level Menu, eg Dark Theme, Light Theme -->
          <ul v-if="item.submenu">
            <li v-hotkey="shortcut(item)" class="menu-item" v-for="subitem in item.submenu" :key="subitem.label">
              <a  @mouseover.prevent="setHover(subitem, item)" :class="hoverClass(subitem)"  @mousedown.prevent="handle(subitem)">
                <span class="label">
                  <span class="material-icons" v-if="subitem.checked">done</span>
                  <span>{{subitem.label}}</span>
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
import platformInfo from '../../common/platform_info'
import { mapGetters } from 'vuex'


export default {
  components: { },
  props: [],
  data() {
    return {
      menuBuilder: null,
      actionHandler: new ClientMenuActionHandler(),
      menus: [],
      menuActive: false,
      selected: null,
      hovered: null,
      hoveredParent: null
    }
  },
  computed: {
    navigationHotkeys() {
      return {
        "esc": this.closeMenu,
        "up": this.moveUp,
        "down": this.moveDown,
        "left": this.moveLeft,
        "right": this.moveRight,
        "enter": this.clickHovered,
      }
    },
    menuElements() {
      return Array.from(this.$refs.nav.getElementsByTagName("*"))
    },
    ...mapGetters({'settings': 'settings/settings'})
  },
  watch: {
    settings: {
      deep: true,
      handler() {
        console.log('updating the menu')
        this.menuBuilder = new MenuBuilder(this.settings, this.actionHandler)
        this.menus = this.menuBuilder.buildTemplate()
      }
    },
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

      const okKeys = ["ArrowUp", "ArrowDown"]
      if (this.menuActive && this.selected) {
        console.log("capturing key! ", e.key)
        if (okKeys.includes(e.key)) {
          e.preventDefault()
          e.stopPropagation()
          if (e.key === "ArrowUp") this.moveUp(e)
          if (e.key === "ArrowDown") this.moveDown(e)
        }
      }
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
    shortcut(item) {
      if (!item.click || !item.accelerator || item.registerAccelerator === false) return {}
      const ctrlKey = platformInfo.isMac ? 'meta' : 'ctrl'
      const keymap = item.accelerator.replace('CommandOrControl', ctrlKey)
      const result = {}
      result[keymap] = item.click
      return result
    },
    setActive(item) {
      this.menuActive = !this.menuActive
      this.selected = item
    },
    setSelected(item) {
      this.selected = item
    },
    unselect(item) {
      if (this.selected === item) this.selected = null
    },
    setHover(item, parent) {
      this.hovered = item
      this.hoveredParent = parent
    },
    maybeHideMenu(event) {
      if (this.menuActive) {
        const target = event.target
        if (this.menuElements.includes(target)) {
          console.log("Hide: not doing anything, menu click")
        } else {
          this.menuActive = false
        }
      } else {
        console.log("Hide: not doing anything, menu not active")
      }

      // check if the item clicked was a part of the menu
      // if (item === this.selected) {
      //   console.log("clicked away", item, this.selected)
      //   setTimeout(() => {
      //     this.menuActive = false
      //   }, 500)
      // }
    },
    handle(item) {
      if (item.click && !item.submenu) {
        item.click(item.label)
        this.menuActive = false
      }
    },
    xelShortcut(shortcut) {
      return shortcut.replace("CommandOrControl", "Control")
    },
    itemKeymap(item) {
      if (!item.click || !item.accelerator || item.registerAccelerator === false) return {}
      const ctrlKey = platformInfo.isMac ? 'meta' : 'ctrl'
      const keymap = item.accelerator.replace('CommandOrControl', ctrlKey)
      const result = {}
      result[keymap] = item.click
      return result
    },
    noop() {
      
    }
  },
  mounted() {
    this.menuBuilder = new MenuBuilder(this.$store.state.settings.settings, this.actionHandler)
    this.menus = this.menuBuilder.buildTemplate()
    document.addEventListener('click', this.maybeHideMenu)
    // window.addEventListener('keydown', this.maybeCaptureKeydown, false)
  },


}
</script>