<template>
  <div class="nav-item-wrap" v-hotkey="keymap" @contextmenu="$emit('contextmenu', $event)">
    <li class="nav-item" :title="title + scope">
      <a
        class="nav-link"
        @mousedown="mousedown"
        @click.middle.prevent="maybeClose"
        :class="{ active: selected }"
      >
        <table-icon v-if="tab.type === 'table'" :table="tab" />
        <i v-else-if="tab.type === 'query'" class="material-icons item-icon query">code</i>
        <i v-else-if="tab.type === 'table-properties'" class="material-icons-outlined item-icon table-properties" :class="iconClass">construction</i>
        <i v-else-if="tab.type === 'settings'" class="material-icons item-icon settings">settings</i>
        <i v-else-if="tab.type ==='table-builder'" class="material-icons item-icon table-builder">add</i>
        <i v-else class="material-icons item-icon">new_releases</i>
        <span class="tab-title truncate" :title="title + scope">{{title}} <span v-if="scope" class="tab-title-scope">{{scope}}</span></span>
        <div class="tab-action">
          <span class="tab-close" @mouseenter="hover=true" @mouseleave="hover=false" @mousedown.stop="doNothing" @click.prevent.stop="maybeClose">
            <i class="material-icons close" v-if="hover || !closeIcon">close</i>
            <i class="material-icons unsaved" v-else>{{closeIcon}}</i>
          </span>
        </div>
      </a>
    </li>
    <modal :name="modalName" class="beekeeper-modal vue-dialog sure" @opened="$refs.no.focus()">
      <div class="dialog-content">
        <div class="dialog-c-title">Are you sure?</div>
        <p>You will lose unsaved changes to '{{this.tab.title}}'</p>
      </div>
      <div class="vue-dialog-buttons">
        <span class="expand"></span>
        <button ref="no" @click.prevent="$modal.hide(modalName)" class="btn btn-sm btn-flat">Cancel</button>
        <button @click.prevent="closeForReal" class="btn btn-sm btn-primary">Close Tab</button>
      </div>
    </modal>
  </div>
</template>
<script>
  import TableIcon from '@/components/common/TableIcon.vue'

  export default {
    props: ['tab', 'tabsCount', 'selected'],
    components: {TableIcon},
    data() {
      return {
        unsaved: false,
        hover: false,
      }
    },
    methods: {
      closeForReal() {
        this.$modal.hide(this.modalName)
        this.$nextTick(() => {
          this.$emit('close', this.tab)
        })
      },
      async maybeClose(event) {
        event.stopPropagation()
        event.preventDefault()
        if (this.tab.unsavedChanges) {
          this.$modal.show(this.modalName)
        } else {
          this.$emit('close', this.tab)
        }
      },
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
      modalName() {
        return `sure-${this.tab.id}`
      },
      closeIcon() {
        if (this.tab.alert) return 'error_outline'
        if (this.tab.unsavedChanges) return 'fiber_manual_record'
        return null
      },
      keymap() {
        const result = {}
        if (this.selected) {
          result[this.ctrlOrCmd('w')] = this.maybeClose
        }

        return result
      },
      cleanText() {
        // no spaces
        if (!this.tab.text) {
          return null
        }
        const result = this.tab.text.replace(/\s+/, '')
        return result.length === 0 ? null : result
      },
      iconClass() {
        const result = {}
        result[`${this.tab.entityType}-icon`] = true
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
