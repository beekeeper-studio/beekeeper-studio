<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      :name="modalName"
      @opened="opened"
    >
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Rename {{ elementType.toLowerCase() }}
          </div>
          <div class="alert alert-warning">
            <i class="material-icons">warning</i>
            <span>
              Be cautious when renaming database object, as it may disrupt related queries, functions, procedures, or other objects that reference it.
            </span>
          </div>
          <error-alert
            :error="errors"
            :title="`Failed to rename ${elementType.toLowerCase()}`"
          />
          <div class="form-group">
            <label for="element-name">Name</label>
            <input id="element-name" name="name" v-model="elementNewName" type="text" ref="nameInput">
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="close"
          >
            Cancel
          </button>
          <x-buttons :disabled="loading">
            <x-button
              class="btn btn-primary"
              @click.prevent="rename"
            >
              Apply
            </x-button>
            <x-button
              class="btn btn-primary"
              menu
            >
              <i class="material-icons">arrow_drop_down</i>
              <x-menu style="--align: end;">
                <x-menuitem @click.prevent="rename">
                  <x-label>Apply</x-label>
                </x-menuitem>
                <x-menuitem @click.prevent="renameSql">
                  <x-label>Copy to SQL</x-label>
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from '@/common/AppEvent';
import { TableOrView } from "@/lib/db/models";
import { mapState } from 'vuex'
import { DatabaseElement } from '@/lib/db/types'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { format } from 'sql-formatter';
import { FormatterDialect } from '@shared/lib/dialects/models'

export default Vue.extend({
  components: {
    ErrorAlert,
  },
  data() {
    return {
      modalName: 'rename-element-modal',
      elementType: "",
      elementName: "",
      elementNewName: "",
      elementSchema: "",
      loading: false,
      errors: null,
    };
  },
  computed: {
    ...mapState(['connection']),
    rootBindings() {
      return [
        { event: AppEvent.setDatabaseElementName, handler: this.open },
      ]
    },
  },
  methods: {
    open(options: { type: DatabaseElement, item: TableOrView | string }) {
      this.loading = false
      this.errors = null
      this.elementType = options.type
      if (typeof options.item === 'string') {
        this.elementName = options.item
      } else {
        this.elementName = options.item.name
      }
      this.elementNewName = this.elementName
      this.$modal.show(this.modalName)
    },
    async opened() {
      await this.$nextTick()
      this.$refs.nameInput.focus()
    },
    close() {
      this.$modal.hide(this.modalName)
    },
    async rename() {
      if (!await this.$confirm(`Are you sure you want to rename the ${this.elementType.toLowerCase()}?`, "", { confirmLabel: "Yes" })) {
        return
      }

      this.loading = true

      try {
        await this.connection.setElementName(this.elementName, this.elementNewName, this.elementType, this.elementSchema)
      } catch (e) {
        this.errors = [e]
        return
      } finally {
        this.loading = false
      }

      this.close()

      this.$store.dispatch('updateTables')
      this.$store.dispatch('updateRoutines')
    },
    renameSql() {
      try {
        const sql = this.connection.setElementNameSql(this.elementName, this.elementNewName, this.elementType, this.elementSchema)
        const formatted = format(sql, { language: FormatterDialect(this.dialect) })
        this.$root.$emit(AppEvent.newTab, formatted)
        this.close()
      } catch (e) {
        this.errors = [e]
      }
    }
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
});
</script>
