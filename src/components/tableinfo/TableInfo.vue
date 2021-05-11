<template>
  <div class="table-info">
    <div class="small-wrap">

      <!-- Table Info Header -->
      <div class="table-info-header">
        <h1 class="table-name">{{table.name}}</h1>
        <div class="table-description-wrap">
          <div class="table-description" @click.prevent="editDescription" v-show="!editingDescription">
            <div ref="descriptionDiv" class="markdown-description" v-html="formattedDescription || 'No Description'"></div>
            <i class="material-icons">edit</i>
          </div>
          <div class="table-description-edit" v-show="editingDescription">
            <textarea  :style="descriptionEditStyle" ref="descriptionTextarea" @blur="editingDescription = false" name="" id="" rows="10" v-model="properties.description" placeholder="Description"></textarea>
            <span>Markdown</span>
          </div>
        </div>
      </div>
  
      <hr>
  
      <!-- Table Info Content -->
      <div class="table-info-content">
  
        <!-- Created -->
        <div class="form-group inline input">
          <label>Type:</label>
          <select>
            <option value="-"></option>
          </select>
        </div>
        <div class="form-group inline input">
          <label>Encoding</label>
          <span>{{properties.encoding}}</span>
        </div>
        <div class="form-group inline input">
          <label>Collation</label>
          <span>{{properties.collation}}</span>
        </div>
        <div class="form-group inline">
          <label>Created at:</label>
          <span>Feb 11, 2021 at 3:20;18 PM</span>
        </div>
        <div class="form-group inline">
          <label>Updated at:</label>
          <span>Not Available</span>
        </div>
  
        <hr>
  
        <!-- Info -->
        <div class="form-group inline">
          <label>Records</label>
          <span>~{{properties.length}}</span>
        </div>
        <div class="form-group inline">
          <label>Data Size</label>
          <span>{{tableSize}}</span>
        </div>
  
        <div class="form-group inline">
          <label>Index Size:</label>
          <span>{{indexSize}}</span>
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
<script>
import marked from 'marked'
import purify from 'dompurify'
import { humanBytes } from '../../common/utils'
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
    tableSize() {
      if (!this.properties.size) return 'unknown MB'
      return humanBytes(this.properties.size)
    },
    indexSize() {
      if (!this.properties.indexSize) return 'unknown MB'
      return humanBytes(this.properties.indexSize)
    },
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