<template>
  <div class="small-wrap">
    <div class="card-flat padding">
    <div class="form-wrap">
      <!-- Creation -->
      <h1>{{table.name}}</h1>
      <div class="table-description">
          <div @click.prevent="editDescription" ref="descriptionDiv" v-show="!editingDescription" class="markdown-description" v-html="formattedDescription"></div>
          <textarea v-show="editingDescription" :style="descriptionEditStyle" ref="descriptionTextarea" @blur="editingDescription = false" name="" id="" rows="10" v-model="properties.description" placeholder="No Description"></textarea>
      </div>
      <div >
        <div class="form-group inline input">
        </div>
        <div class="form-group inline input">
          <label>Type:</label>
          <select>
            <option value="-"></option>
          </select>
        </div>
        <div class="form-group inline input">
          <label>Encoding:</label>
          <select>
            <option value="-"></option>
          </select>
        </div>
        <div class="form-group inline input">
          <label>Collation:</label>
          <select>
            <option value="-"></option>
          </select>
        </div>
        <div class="form-group inline">
          <label>Created at:</label>
          <span>Feb 11, 2021 at 3:20;18 PM</span>
        </div>
        <div class="form-group inline">
          <label>Updated at:</label>
          <span>Not Available</span>
        </div>
      </div>
      <hr>

      <!-- Info -->
      <div >
        <div class="form-group inline">
          <label>Number of row:</label>
          <span>~442,274</span>
        </div>
        <div class="form-group inline">
          <label>Row format:</label>
          <span>Dynamic</span>
        </div>
        <div class="form-group inline">
          <label>Avg. row length:</label>
          <span>46</span>
        </div>
        <div class="form-group inline">
          <label>Auto Increment:</label>
          <span>Not available</span>
        </div>
        <div class="form-group inline">
          <label>Data Size:</label>
          <span>19.6 MiB</span>
        </div>
        <div class="form-group inline">
          <label>Max data Size:</label>
          <span>0 B</span>
        </div>
        <div class="form-group inline">
          <label>Index Size:</label>
          <span>0 B</span>
        </div>
        <div class="form-group inline">
          <label>Free data Size:</label>
          <span>4.0 MiB</span>
        </div>
      </div>
      <hr>

      <!-- Comments/Syntax -->
      <div>

        <div class="form-group inline input">
          <label>Create Syntax</label>
          <textarea name="" id="" rows="3"></textarea>
        </div>
      </div>
    </div>

    </div>
  </div>
</template>
<style lang="scss">
  .table-description {
    border: 1px solid pink;
    background-color:#0000001a;
    padding: 10px;
  }
</style>
<script>
import marked from 'marked'
import purify from 'dompurify'
export default {
  props: ["table", "connection", "active", "properties"],
  data() {
    return {
      tableInfo: null,
      editingDescription: false,
      descriptionEditHeight: null
    }
  },
  methods: {
    editDescription() {
      this.editingDescription = true
      this.descriptionEditHeight = this.$refs.descriptionDiv.clientHeight
      this.$nextTick(() => {
        if (this.$refs.descriptionTextarea)
          this.$refs.descriptionTextarea.focus()
      })
    }
  },
  computed: {
    descriptionEditStyle() {
      return {
        height: `${this.descriptionEditHeight}px`
      }
    },
    formattedDescription() {
      if (!this.properties.description) return null
      return purify.sanitize(marked(this.properties.description))
    },
    tableColumns() {
      return [{ title: 'name', field: 'name'}, {title:'type', field: 'type'}]
    },
    tableData() {
      return this.table.columns.map((c) => {
        return {name: c.columnName, type: c.dataType}
      })
    },
  },
  mounted() {
  }
}
</script>