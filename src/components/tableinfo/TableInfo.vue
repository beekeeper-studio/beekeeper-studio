<template>

  <div class="table-info">
    <div class="small-wrap">
      <h1>{{table.name}} <span class="entity-type badge">{{table.entityType}}</span></h1>
      <div class="table-description">
          <div @click.prevent="editDescription" ref="descriptionDiv" v-show="!editingDescription" class="markdown-description" v-html="formattedDescription"></div>
          <textarea v-show="editingDescription" :style="descriptionEditStyle" ref="descriptionTextarea" @blur="editingDescription = false" name="" id="" rows="10" v-model="properties.description" placeholder="No Description"></textarea>
      </div>
      <div class="card-flat padding">
      <div class="form-wrap">
        <!-- Creation -->
        <div >
          <div class="form-group inline input">
            <label>Encoding</label>
            <span>{{properties.encoding}}</span>
          </div>
          <div class="form-group inline input">
            <label>Collation</label>
            <span>{{properties.collation}}</span>
          </div>
        </div>
        <hr>
  
        <!-- Info -->
        <div >
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
      return humanBytes(this.properties.size)
    },
    indexSize() {
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