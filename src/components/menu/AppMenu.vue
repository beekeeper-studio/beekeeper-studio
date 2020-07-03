
<template>
  <x-menubar>
    <x-menuitem v-for="menu in menus" :key="menu.label">
      
      <x-label>{{menu.label}}</x-label>
      <x-menu v-if="menu.submenu">
        <div v-for="(item, idx) in menu.submenu" :key="item.id || idx">
          <hr v-if="item.type === 'separator'">
          <x-menuitem v-else v-hotkey="itemKeymap(item)" @click="item.click && !item.submenu ? item.click(item.label) : null">
            <x-label>{{item.label || item.role}}</x-label>
            <x-shortcut v-if="item.accelerator" :value="xelShortcut(item.accelerator)"></x-shortcut>
            <x-menu v-if="item.submenu">
              <x-menuitem v-for="(child, idx) in item.submenu" :key="child.id || idx" @click.prevent="child.click ? child.click(child.label) : noop()">
                <x-label>{{child.label}}</x-label>
              </x-menuitem>
            </x-menu>
          </x-menuitem>
        </div>

      </x-menu>

    </x-menuitem>
  </x-menubar>
</template>

<script>
import ClientMenuActionHandler from '../../lib/menu/ClientMenuActionHandler'
import MenuBuilder from '../../common/menus/MenuBuilder'
import platformInfo from '../../common/platform_info'
export default {
  components: {},
  props: [],
  data() {
    return {
      menuBuilder: null,
      actionHandler: null,
      menus: [],
    }
  },
  methods: {
    xelShortcut(shortcut) {
      return shortcut.replace("CommandOrControl", "Control")
    },
    itemKeymap(item) {
      if (!item.click || !item.accelerator) return
      const ctrlKey = platformInfo.isMac ? 'meta' : 'ctrl'
      const keymap = item.accelerator.replace('CommandOrControl', ctrlKey)
      const result = {}
      result[keymap] = item.click
      return result
    },
    noop() {
      console.log("noop")
    }
  },
  mounted() {
    this.actionHandler = new ClientMenuActionHandler(this.$root, this.$store.state.settings.settings)
    this.menuBuilder = new MenuBuilder(this.$store.state.settings.settings, this.actionHandler)
    this.menus = this.menuBuilder.buildTemplate()
  },


}
</script>