
<template>
<nav class="flyout-nav">
  <ul class="menu-bar">
    <li class="top-menu-item" v-for="menu in menus" :key="menu.label">
      <a @mousedown.prevent="noop"><span class="label">{{menu.label}}</span></a>
      <ul>
        <li class="menu-item" :class="{'has-children': !!item.submenu}" v-for="(item, idx) in menu.submenu" :key="item.id || idx">
          <a @mousedown.prevent="handle(item)">
            <span class="label">{{item.label}}</span>
            <span class="shortcut">{{item.accelerator}}</span>

          </a>
          <ul v-if="item.submenu">
            <li class="menu-item" v-for="subitem in item.submenu" :key="subitem.label">
              <a @mousedown.prevent="handle(subitem)">
                <span class="label">
                  <span class="material-icons" v-if="subitem.checked">done</span>
                  {{subitem.label}}
                </span></a>
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

export default {
  components: { },
  props: [],
  data() {
    return {
      menuBuilder: null,
      actionHandler: null,
      menus: [],
    }
  },
  methods: {
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