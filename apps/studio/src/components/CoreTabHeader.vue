<template>
  <div class="nav-item-wrap">
    <li class="nav-item" :title="title + scope">
      <a
        class="nav-link"
        @mousedown="mousedown"
        @click.middle.prevent="$emit('close', tab)"
        :class="{ active: selected }"
      >
        <i v-if="tab.type === 'table'" :class="iconClass" class="material-icons item-icon table">grid_on</i>
        <i v-if="tab.type === 'query'" class="material-icons item-icon query">code</i>
        <i v-if="tab.type === 'table-properties'" class="material-icons item-icon table-properties" :class="iconClass">lightbulb</i>
        <i v-if="tab.type === 'settings'" class="material-icons item-icon settings">settings</i>
        <span class="tab-title truncate" :title="title + scope">{{title}} <span v-if="scope" class="tab-title-scope">{{scope}}</span></span>
        <div class="tab-action">
          <span class="tab-close" :class="{unsaved: tab.unsavedChanges}" @mousedown.stop="doNothing" @click.prevent.stop="$emit('close', tab)">
            <i class="material-icons close">close</i>
            <i class="material-icons unsaved-icon" >fiber_manual_record</i>
          </span>
        </div>
      </a>
    </li>
    <x-contextmenu>
      <x-menu>
        <x-menuitem @click.prevent="$emit('close', tab)">
          <x-label>Close</x-label>
          <x-shortcut value="Control+W"></x-shortcut>
        </x-menuitem>
        <x-menuitem @click.prevent="$emit('closeOther', tab)">
          <x-label>Close Others</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="$emit('closeAll')">
          <x-label>Close All</x-label>
        </x-menuitem>
        <hr>
        <x-menuitem @click.prevent="$emit('duplicate', tab)">
          <x-label>Duplicate</x-label>
        </x-menuitem>
      </x-menu>
    </x-contextmenu>
  </div>
</template>
<script>

  export default {
    props: ['tab', 'tabsCount', 'selected'],
    data() {
      return {
        unsaved: false,
      }
    },
    methods: {
      doNothing() {
        
      },
      mousedown(e) {
        if (e.which === 1) {
          this.$emit('click', this.tab)
        }
      }
    },
    watch: {
    },
    computed: {
      cleanText() {
        // no spaces
        if (!this.tab.text) {
          return null
        }
        const result = this.tab.text.replace(/\s+/, '')
        return result.length == 0 ? null : result
      },
      iconClass() {
        const result = {}
        result[`${this.tab.table.entityType}-icon`] = true
        return result
      },
      scope() {
        if (this.tab.titleScope) {
          return ' ' + '[' + this.tab.titleScope + ']'
        } else {
          return ''
        }
      },
      tableTabTitle() {
        if (!this.tab.type === 'table') return null;
        let result = this.tab.table.name
        return result
      },
      queryTabTitle() {
        if (!this.tab.type === 'query') return null
          if (this.tab.query && this.tab.query.title) {
            return this.tab.query.title
          }
          if (!this.cleanText) {
            return this.tab.title
          }

          if (this.tab.query.text.length >= 32) {
            return `${this.tab.query.text.substring(0, 32)}...`
          } else {
            return this.tab.query.text
          }
      },
      title() {
        return this.queryTabTitle || this.tableTabTitle || "Unknown"
      },
    }
  }

</script>
