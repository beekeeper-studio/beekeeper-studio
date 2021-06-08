
<template>
<nav class="flyout-nav" v-hotkey="allHotkeys"  :class="{active: menuActive}" ref="nav">
  <!-- TOP MENU, eg File, Edit -->
  <ul class="menu-bar">
    <li @mouseover.prevent="setSelected(menu)" @dblclick.stop="noop()" @mouseleave.prevent="unselect(menu)" class="top-menu-item" :class="{selected: menu === selected}" v-for="menu in menus" :key="menu.label">
      <a :class="{selected: menu === selected}" @mousedown.prevent="setActive(menu)"><span class="label">{{menu.label}}</span></a>
      <!-- FIRST LEVEL MENU, eg New Window, New Tab -->
      <ul>
        <li v-hotkey="shortcut(item)"  class="menu-item" :class="{'has-children': !!item.submenu, ...hoverClass(item)}" v-for="(item, idx) in menu.submenu" :key="item.id || idx">
          <a  @mousedown.prevent="noop()" @mouseup.prevent="handle(item)" @mouseover.prevent="setHover(item)" :class="hoverClass(item)">
            <span class="label">{{item.label}}</span>
            <span class="shortcut">{{shortcutText(item)}}</span>
          </a>
          <!-- Second Level Menu, eg Dark Theme, Light Theme -->
          <ul v-if="item.submenu">
            <li v-hotkey="shortcut(item)" class="menu-item" v-for="subitem in item.submenu" :key="subitem.label">
              <a  @mouseover.prevent="setHover(subitem, item)" :class="hoverClass(subitem)" @mousedown.prevent="noop()"  @mouseup.prevent="handle(subitem)">
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
      hoveredParent: null,
      navigationKeys: {
        "ArrowUp": this.moveUp,
        "ArrowDown": this.moveDown,
        "ArrowLeft": this.moveLeft,
        "ArrowRight": this.moveRight,
        "Escape": this.closeMenu,
        "Enter": this.clickHovered
      }
    }
  },
  computed: {
    allHotkeys() {
      const result = {}
      this.menus.forEach(menu => {
        menu.submenu.forEach(item => {
          if (item.accelerator && item.click) {
            result[this.shortcut(item)] = item.click
          }
        })
      })
      return result
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
      const meta = platformInfo.isMac ? 'Cmd' : 'Ctrl'
      return item.accelerator.replace('CommandOrControl', meta)
    },
    shortcut(item) {
      if (!item.click || !item.accelerator || item.registerAccelerator === false) return {}
      const ctrlKey = platformInfo.isMac ? 'meta' : 'ctrl'
      return item.accelerator
        .replace('CommandOrControl', ctrlKey)
        .replace('Plus', 'numpad +')
        .toLowerCase()
    },
    setActive(item) {
      this.menuActive = !this.menuActive
      this.selected = item
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

    }
  },
  mounted() {
    this.menuBuilder = new MenuBuilder(this.$store.state.settings.settings, this.actionHandler)
    this.menus = this.menuBuilder.buildTemplate()
    document.addEventListener('click', this.maybeHideMenu)
    window.addEventListener('keydown', this.maybeCaptureKeydown, false)
  },


}
</script>
