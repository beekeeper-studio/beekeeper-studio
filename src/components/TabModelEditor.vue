<template>
  <div class="query-editor" ref="editorContainer">
    <erd-editor ref="editor"></erd-editor>
    <span class="expand"></span>
    <div class="toolbar text-right">
      <div class="actions btn-group" ref="actions">
        <x-button @click.prevent="triggerSave" class="btn btn-flat">Save</x-button>
      </div>
    </div>

    <!-- Save Modal -->
    <modal class="vue-dialog beekeeper-modal" name="save-modal" @opened="selectTitleInput" height="auto" :scrollable="true">
      <form @submit.prevent="saveQuery">
        <div class="dialog-content">
          <div class="dialog-c-title">Saved Model Name</div>
          <div class="modal-form">
            <div class="alert alert-danger save-errors" v-if="saveError">{{saveError}}</div>
            <div class="form-group">
                <input type="text" ref="titleInput" name="title" class="form-control"  v-model="tab.query.title" autofocus>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('save-modal')">Cancel</button>
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>
    </modal>

  </div>
</template>

<script>

  import { mapState } from 'vuex'

  export default {
    // this.queryText holds the current editor value, always
    props: ['tab', 'active'],
    data() {
      return {
        editor: null,
        unsavedText: null,
        saveError: null,
        resizeObserver: null
      }
    },
    computed: {
      query() {
        return this.tab.query
      },
      queryText() {
        return this.tab.query.text
      },
      hasTitle() {
        return this.query.title && this.query.title.replace(/\s+/, '').length > 0
      },

      ...mapState(['usedConfig', 'connection', 'database', 'tables'])
    },
    watch: {
      active() {
        if (this.active && this.editor) {
          this.editor.focus()
          this.onSaveKeymap()
        } else {
          if (this.editor) {
            this.editor.blur()
          }
          this.offSaveKeymap()
          this.$modal.hide('save-modal')
        }
      },
      queryText() {
        if (this.query.id && this.unsavedText === this.queryText) {
          this.tab.unsavedChanges = false
          return
        } else {
          this.tab.unsavedChanges = true
        }
      }
    },
    methods: {
      resizeEditor() {
        const $editorContainer = this.$refs.editorContainer
        this.editor.width = $editorContainer.clientWidth
        this.editor.height = $editorContainer.clientHeight
      },
      triggerSave() {
        if (this.query.id) {
          this.saveQuery()
        } else {
          this.$modal.show('save-modal')
        }
      },
      async saveQuery() {
        if (!this.hasTitle) {
          this.saveError = "You need a title."
        } else {
          await this.$store.dispatch('saveModel', this.query)
          this.$modal.hide('save-modal')
          this.$noty.success('Saved')
          this.unsavedText = this.tab.query.text
          this.tab.unsavedChanges = false
        }
      },
      selectTitleInput() {
        this.$refs.titleInput.select()
      },
      changeText() {
        this.query.text = this.editor.value
      },
      saveKeymap(e) {
        if ((e.ctrlKey && e.code === 'KeyS') || (e.metaKey && e.code === 'KeyS')) {
          this.triggerSave()
        }
      },
      onSaveKeymap() {
        window.addEventListener('keyup', this.saveKeymap)
      },
      offSaveKeymap() {
        window.removeEventListener('keyup', this.saveKeymap)
      }
    },
    mounted() {
      this.editor = this.$refs.editor
      this.resizeObserver = new ResizeObserver(() => this.resizeEditor())
      this.resizeObserver.observe(this.$refs.editorContainer)
      this.editor.addEventListener('change', this.changeText)
      if (this.query.text) {
        this.editor.initLoadJson(this.query.text)
      }
      this.onSaveKeymap()
    },
    beforeDestroy() {
      this.resizeObserver.unobserve(this.$refs.editorContainer)
      this.editor.removeEventListener('change', this.changeText)
      this.offSaveKeymap()
    },
  }
</script>

<style lang="scss" scoped>
  .query-editor .toolbar {
    position: fixed;
    bottom: 0;
    right: 0;
    background: none !important;
    z-index: 100003000 !important;
  }
</style>
