
<template>
<nav class="flyout-nav" v-hotkey="navigationHotkeys" :class="{active: menuActive}">
  <ul class="menu-bar">
    <li @mouseover.prevent="setSelected(menu)" class="top-menu-item" :class="{selected: menu === selected}" v-for="menu in menus" :key="menu.label">
      <a @mousedown.prevent="setActive(menu)"><span class="label">{{menu.label}}</span></a>
      <ul v-on-clickaway="hide(menu)">
        <li v-hotkey="shortcut(item)" class="menu-item" :class="{'has-children': !!item.submenu}" v-for="(item, idx) in menu.submenu" :key="item.id || idx">
          <a @mousedown.prevent="handle(item)">
            <span class="label">{{item.label}}</span>
            <span class="shortcut">{{item.accelerator}}</span>
          </a>
          <ul v-if="item.submenu">
            <li class="menu-item" v-for="subitem in item.submenu" :key="subitem.label">
              <a @mousedown.prevent="handle(subitem)">
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
import ClientMenuActionHandler from '../../lib/menu/ClientMenuActionHandler'
import MenuBuilder from '../../common/menus/MenuBuilder'
import platformInfo from '../../common/platform_info'
import { mixin as clickaway } from 'vue-clickaway';


export default {
  components: { },
  mixins: [ clickaway ],
  props: [],
  data() {
    return {
      menuBuilder: null,
      actionHandler: null,
      menus: [],
      menuActive: false,
      selected: null
    }
  },
  computed: {
    navigationHotkeys() {
      if (!this.menuActive) return {}
      return {
        "esc": this.setActive,
      }
    }
  },
  watch: {
    menuActive() {
      if (!this.menuActive) {
        this.selected = null
      }
    }
  },
  methods: {
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
    hide() {
      console.log("click away")
      // check if the item clicked was a part of the menu
      // if (item === this.selected) {
      //   console.log("clicked away", item, this.selected)
      //   setTimeout(() => {
      //     this.menuActive = false
      //   }, 500)
      // }
    },
    handle(item) {
      return item.click && !item.submenu ? item.click(item.label) : null
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
    this.actionHandler = new ClientMenuActionHandler(this.$root, this.$store.state.settings.settings)
    this.menuBuilder = new MenuBuilder(this.$store.state.settings.settings, this.actionHandler)
    this.menus = this.menuBuilder.buildTemplate()
  },


}
</script>