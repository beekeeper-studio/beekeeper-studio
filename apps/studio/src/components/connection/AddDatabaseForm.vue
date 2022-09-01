<template>
  <form class="save-connection expand">
    <h3 class="dialog-c-title">Add database</h3>

    <div v-if="error" class="alert alert-danger">
      {{error}}
    </div>

    <div class="form-group">
      <input class="form-control" v-model="databaseName" @keydown.enter.prevent.stop="save" type="text" placeholder="Database Name">
    </div>

    <div class="form-group">
      <select v-model="selectedCharset">
        <option v-for="charset in charSets" v-bind:key="charset" :selected="charset === defaultCharSet" :value="charset">{{charset}}</option>
      </select>
    </div>

    <div class="form-group" v-if="collationsLength">
      <select v-model="selectedCollation">
        <option v-for="collation in collations" v-bind:key="collation" :value="collation">{{collation}}</option>
      </select>
    </div>

    <div class="save-actions">
      <button class="btn btn-flat" @click.prevent="$emit('cancel')">Cancel</button>
      <button class="btn btn-primary save" type="submit" @click.prevent="save">Add</button>
    </div>
  </form>
</template>

<script>
  export default {
    props: ['connection'],
    data() {
      return {
        charSets: [],
        collations: [],
        defaultCharSet: null,
        databaseName: null,
        selectedCharset: null,
        selectedCollation: null,
        error: null
      }
    },
    async mounted(){
      this.charSets = await this.connection.listCharsets()
      this.defaultCharSet = await this.connection.getDefaultCharSet()
      this.selectedCharset = this.defaultCharSet
      console.log(this.selectedCharset)
      await this.updateCollations()
    },
    methods: {
      async updateCollations() {
        this.collations = await this.connection.listCollations(this.selectedCharset)
        this.selectedCollation = this.collations[0]
      },
      async save() {
        try {
          await this.connection.createDatabase(this.databaseName, this.selectedCharset, this.selectedCollation)
          this.$noty.success('The database was created')
          this.$emit('databaseCreated', this.databaseName)
        } catch (err) {
          this.error = `The database could not be created: ${err.message}"`
        }
      }
    },
    watch: {
      selectedCharset() {
        this.updateCollations()
      }
    },
    computed: {
      collationsLength() {
        console.log(this.collations.length > 0)
        return this.collations.length > 0
      }
    }
  }
</script>