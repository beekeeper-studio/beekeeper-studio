<template>
  <form
    class="save-connection expand"
    @submit.prevent="save"
  >
    <h3
      class="dialog-c-title"
      v-if="this.connectionType === 'cassandra'"
    >
      Add Keyspace
    </h3>
    <h3
      class="dialog-c-title"
      v-else
    >
      Add database
    </h3>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="form-group">
      <input
        class="form-control"
        v-model="databaseName"
        @keydown.enter.prevent.stop="save"
        type="text"
        placeholder="Database Name"
      >
    </div>

    <div
      class="form-group"
      v-if="charsets.length > 0"
    >
      <label
        for="addDatabaseCharset"
        v-if="this.connectionType === 'cassandra'"
      >
        Select Replication Strategy
      </label>
      <select
        v-model="selectedCharset"
        id="addDatabaseCollation"
      >
        <option
          v-for="charset in charsets"
          :key="charset"
          :selected="charset === selectedCharset"
          :value="charset"
        >
          {{ charset }}
        </option>
      </select>
    </div>

    <div
      class="form-group"
      v-if="collations.length > 0"
    >
      <select v-model="selectedCollation">
        <option
          v-for="collation in collations"
          :key="collation"
          :value="collation"
        >
          {{ collation }}
        </option>
      </select>
    </div>

    <div class="save-actions">
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary save"
        type="submit"
        :disabled="!databaseName"
      >
        Add
      </button>
    </div>
  </form>
</template>

<script>
  import { mapState } from 'vuex';

  export default {
    props: [],
    data() {
      return {
        charsets: [],
        collations: [],
        databaseName: null,
        selectedCharset: null,
        selectedCollation: null,
        error: null
      }
    },
    computed: {
      ...mapState(['connection', 'connectionType'])
    },
    async mounted(){
      this.charsets = await this.connection.listCharsets();
      this.selectedCharset = await this.connection.getDefaultCharset();
      await this.updateCollations()
    },
    methods: {
      async updateCollations() {
        if (this.$store.getters.dialectData.disabledFeatures?.collations) return
        this.collations = await this.connection.listCollations(this.selectedCharset);
        this.selectedCollation = this.collations[0]
      },
      async save() {
        try {
          const createdDb = await this.connection.createDatabase(this.databaseName, this.selectedCharset, this.selectedCollation);
          this.$noty.success('The database was created')
          this.$emit('databaseCreated', createdDb)
        } catch (err) {
          this.error = `The database could not be created: ${err.message}"`
        }
      }
    },
    watch: {
      selectedCharset() {
        this.updateCollations()
      }
    }
  }
</script>
