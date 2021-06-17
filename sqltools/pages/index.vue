<template>
  <div class="container">
    <table-schema
      :table="table"
      :active="true"
      :primaryKeys="primaryKeys"
    ></table-schema>
  </div>
</template>

<script>

import TableSchema from '@shared/components/TableSchema.vue'
export default {
  components: { TableSchema },
  data() {
    return {
      primaryKeys: ['foo'],
      table: {
        name: "fake",
        columns: [
          { ordinalPosition: 1, columnName: "foo", dataType: 'varchar(255)', nullable: false}
        ]
      }
    }
  }
}
</script>

<style>
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family:
    'Quicksand',
    'Source Sans Pro',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}
</style>
