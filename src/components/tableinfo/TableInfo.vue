<template>
  <div class="small-wrap">
    <div class="card-flat padding">
    <div class="form-wrap">
      <!-- Creation -->
      <div >
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
          <label>Comments</label>
          <textarea name="" id="" rows="2"></textarea>
        </div>
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
export default {
  props: ["table", "connection", "active"],
  data() {
    return {
      tableInfo: null
    }
  },
  computed: {
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