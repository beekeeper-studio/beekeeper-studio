<template>
  <div>
    <li class="nav-item" :title="title" @contextmenu.prevent="$refs.menu.open">
      <a
          class="nav-link"
          @click.prevent.stop="$emit('click', tab)"
          @click.middle.prevent.stop="$emit('close', tab)"
          :class="{ active: selected }"
      >
        <i v-if="tab.type === 'table'" :class="iconClass" class="material-icons item-icon table">grid_on</i>
        <i v-if="tab.type === 'query'" class="material-icons item-icon query">code</i>
        <i v-if="tab.type === 'settings'" class="material-icons item-icon settings">settings</i>
        <span class="tab-title truncate">{{title}}</span>
        <div class="tab-action">
        <span class="tab-close" :class="{unsaved: tab.unsavedChanges}" @click.prevent.stop="$emit('close', tab)">
          <i class="material-icons close">close</i>
          <i class="material-icons unsaved-icon" >fiber_manual_record</i>
        </span>
        </div>
      </a>
    </li>

    <vue-context ref="menu" :close-on-click="true">
      <li>
        <a href="#" @click.prevent="$emit('close', tab)">Close</a>
      </li>
      <li v-if="this.tabsCount > 1">
        <a href="#" @click.prevent="$emit('closeOther', tab)">Close Others</a>
      </li>
      <li v-if="this.tabsCount > 1">
        <a href="#" @click.prevent="$emit('closeAll')">Close All</a>
      </li>
      <li class="separator"></li>
      <li>
        <a href="#" @click.prevent="$emit('duplicate', tab)">Duplicate</a>
      </li>
    </vue-context>
  </div>
</template>
<script>
  import VueContext from 'vue-context';

  export default {
    props: ['tab', 'tabsCount', 'selected'],
    components: { VueContext },
    data() {
      return {
        unsaved: false,
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
      title() {
        if (this.tab.type === 'query') {
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
        } else if (this.tab.type === 'table') {
          return this.tab.table.name;
        }
        return this.tab.title
      }
    },

  }

</script>
