<template>
  <div class="table-info">
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