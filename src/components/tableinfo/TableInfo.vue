<template>
  <div class="table-info">
    <h1 class="table-name">
      <i :title="title" :class="iconClass" class="item-icon material-icons">grid_on</i>
      <span>{{fullName}}</span>
    </h1>
    <div class="table-meta" v-if="createdAt || owner">
      <span v-if="createdAt" class="table-meta-created">Created at {{createdAt}}</span>
      <span v-if="owner" class="table-meta-owner">Owned by {{owner}}</span>
    </div>
    <div title="Table Description (Table Comment)" v-if="supportsDescription" class="table-description-wrap">
      <div class="table-description" :class="descriptionClass" @click.prevent="editDescription" v-show="!editingDescription">
        <div ref="descriptionDiv" class="markdown-description" v-html="formattedDescription || 'No Description'"></div>
        <i class="material-icons">edit</i>
      </div>
      <div class="table-description-edit" v-show="editingDescription">
        <textarea @keydown="checkForEsc" @blur="revertDescription" :style="descriptionEditStyle" ref="descriptionTextarea" name="" id="" :rows="descriptionEditRows" v-model="properties.description" placeholder="Description"></textarea>
        <div class="table-description-actions">
          <div class="btn-group">
            <button class="btn btn-flat" @click.prevent="revertDescription">Cancel</button>
            <button class="btn btn-primary" @mousedown.prevent.stop="saveDescription">Save</button>
          </div>
        </div>
        <span class="markdown" title="The description supports **markdown** `syntax`">
          <a @mousedown.prevent.stop="() => {}" href="https://www.markdownguide.org/basic-syntax/">Markdown</a>
        </span>
      </div>
    </div>
  </div>
</template>
<script>
import marked from 'marked'
import purify from 'dompurify'
import { format as humanBytes } from 'bytes'
import TimeAgo from 'javascript-time-ago'
export default {
  props: ["table", "connection", "active", "properties"],
  data() {
    return {
      tableInfo: null,
      editingDescription: false,
      oldDescription: undefined,
      descriptionEditRows: 10,
      descriptionClass: {},
      timeAgo: new TimeAgo('en-US'),
    }
  },
  methods: {
    editDescription() {
      this.editingDescription = true
      this.oldDescription = this.properties.description || null
      this.descriptionEditRows = (this.properties.description || '').split("\n").length + 1
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
      console.log("revert", this.oldDescription)
      if (this.oldDescription === undefined) {
        console.log('not reverting')
        return
      }
      this.properties.description = this.oldDescription
      this.oldDescription = undefined
      this.editingDescription = false
    },
    async saveDescription() {
      this.justSaved = true
      console.log("save")
      this.editingDescription = false
      this.oldDescription = undefined
      const confirmedValue = await this.connection.setTableDescription(this.table.name, this.properties.description, this.table.schema)
      this.properties.description = confirmedValue
      this.desciptionClass = {'edit-success': true}
      setTimeout(() => {
        this.descriptionClass = {}
      }, 1000)

    }
  },
  computed: {
    iconClass() {
      const result = {}
      result[`${this.table.entityType}-icon`] = true
      return result
    },
    title() {
      return this.table.entityType
    },
    supportsDescription() {
      return this.table.entityType === 'table' && this.connection.supportedFeatures().comments === true
    },
    owner() {
      if (!this.properties) return null
      return this.properties.owner || null
    },
    createdAt() {
      if (!this.properties || !this.properties.createdAt) return null
      return this.timeAgo.format(Date.parse(this.properties.createdAt)) || null
    },
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