<template>
  <div class="merge-manager">
    <div
      v-if="pendingMerge"
      class="alert alert-notice"
    >
      <i class="material-icons">info_outlined</i>
      <div class="alert-body">
        Merge Completed
      </div>
      <span class="alert-footer btn-group">
        <span class="expand" />
        <a
          class="btn btn-sm btn-link"
          @click.prevent="undoMerge"
          title="What have you done to my query!?"
        >Undo</a>
        <a
          class="btn btn-sm btn-primary"
          @click.prevent="acceptMerge"
          title="Like magic"
        >Looks Good</a>
      </span>
    </div>

    <div
      v-else-if="pendingRemoteChanges"
      class="alert alert-info"
    >
      <i class="material-icons">error_outline</i>
      <div class="alert-body">
        This query has been updated by someone else.
      </div>
      <span class="alert-footer btn-group">
        <span class="expand" />
        <x-button
          @click.prevent="viewDiff"
          class="btn btn-link"
        >Preview Merge</x-button>
        <x-buttons>
          <x-button
            title="Merge local and remote changes together"
            class="btn btn-primary btn-small"
            @click.prevent="merge"
          >Merge</x-button>
          <x-button
            class="btn btn-primary btn-small"
            menu
          >
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem
                title="Discard local changes and reload with only the remote changes"
                @click.prevent="discardLocal"
              >
                <x-label>Discard Local Changes</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
      </span>
    </div>

    <portal to="modals">
      <modal
        name="diff-modal"
        class="beekeeper-modal vue-dialog diff-modal"
      >
        <div v-kbd-trap="true">
          <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
          <div class="dialog-content">
            <div class="dialog-c-title">
              Merge Preview
            </div>
            <diff-viewer
              v-if="diff"
              :diff="diff"
            />
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              @click.prevent="$modal.hide('diff-modal')"
            >
              Close
            </button>
          </div>
        </div>
      </modal>
    </portal>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import DiffPatchMerge from 'diff-match-patch'
import DiffViewer from '@/components/editor/DiffViewer.vue'


export default Vue.extend({
  components: { DiffViewer },
  props: ['query', 'unsavedText', 'originalText'],
  data: () => ({
    preMergeText: null,
    diff: null
  }),
  computed: {
    remoteText() {
      return this.query.text
    },
    localText() {
      return this.unsavedText
    },
    pendingLocalChanges() {
      return _.trim(this.unsavedText) !== _.trim(this.originalText)
    },
    pendingRemoteChanges() {
      // the query object changed in the background
      return this.query.text !== this.originalText
    },
    pendingMerge() {
      return !!this.preMergeText
    }

  },
  watch: {

  },
  methods: {
    discardLocal() {
      this.$emit('change', this.query.text)
      this.acceptMerge()
    },
    merge() {
      // if user hasn't edited the query, we just replace it.
      if (!this.pendingLocalChanges) {
        this.discardLocal()

        return
      }
      const final = this.generateNewText()
      this.preMergeText = this.unsavedText
      console.log("post patch value:", final)
      this.$emit('change', final)
    },
    generateNewText() {

      // otherwise we use optimistic patching
      const patcher = new DiffPatchMerge()
      console.log("Make Patch: ", this.originalText, this.query.text)

      const patch = patcher.patch_make(this.originalText, this.query.text)
      console.log("Apply Patch", this.unsavedText, patch)
      const [final] = patcher.patch_apply(patch, this.unsavedText)
      return final

    },
    acceptMerge() {
      this.preMergeText = null
      this.$emit('mergeAccepted')
    },
    undoMerge() {
      this.$emit('change', this.preMergeText)
      this.preMergeText = null
    },
    viewDiff() {
      const patcher = new DiffPatchMerge()
      const final = this.generateNewText()
      const rawDiffs = patcher.diff_main(this.unsavedText, final)
      patcher.diff_cleanupSemantic(rawDiffs)
      // const patches = patcher.patch_make(rawDiffs)
      this.diff = patcher.diff_prettyHtml(rawDiffs)
      this.$modal.show('diff-modal')
    }

  },
})
</script>

<style lang="scss" scoped>
  @import '../../assets/styles/app/_variables';

  .merge-manager {
    margin: 0 $gutter-h;
    > i {
      line-height: 26px; // button height;
    }
  }
</style>
