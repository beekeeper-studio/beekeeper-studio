<template>
  <div class="table-info">
    <h1 class="table-name">{{fullName}}</h1>
    <div class="table-description-wrap">
      <div class="table-description" :class="descriptionClass" @click.prevent="editDescription" v-show="!editingDescription">
        <div ref="descriptionDiv" class="markdown-description" v-html="formattedDescription || 'No Description'"></div>
        <i class="material-icons">edit</i>
      </div>
      <div class="table-description-edit" v-show="editingDescription">
        <textarea @keydown="checkForEsc"  :style="descriptionEditStyle" ref="descriptionTextarea" name="" id="" :rows="descriptionEditRows" v-model="properties.description" placeholder="Description"></textarea>
        <div class="table-description-actions">
          <div class="btn-group">
            <button class="btn btn-flat" @click.prevent="revertDescription">Cancel</button>
            <button class="btn btn-primary" @click.prevent="saveDescription">Save</button>
          </div>
        </div>
        <span class="markdown">Markdown</span>
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
      oldDescription: null,
      descriptionEditRows: 10,
      descriptionClass: {}
    }
  },
  methods: {
    editDescription() {
      this.editingDescription = true
      this.oldDescription = this.properties.description
      this.descriptionEditRows = this.properties.description.split("\n").length + 1
      this.$nextTick(() => {
        if (this.$refs.descriptionTextarea)
          this.$refs.descriptionTextarea.focus()
      })
    },
    checkForEsc(e) {
      if (e.key === 'Escape') {
        this.revertDescription()
      }
    },
    async revertDescription() {
      this.properties.description = this.oldDescription
      this.oldDescription = null
      this.editingDescription = false
    },
    async saveDescription() {
      this.editingDescription = false
      const confirmedValue = await this.connection.setTableDescription(this.table.name, this.properties.description, this.table.schema)
      this.properties.description = confirmedValue
      this.desciptionClass = {'edit-success': true}
      setTimeout(() => {
        this.descriptionClass = {}
      }, 1000)

    }
  },
  computed: {
    fullName() {
      const table = this.table
      return table.schema ? `${table.schema}.${table.name}` : table.name
    },
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