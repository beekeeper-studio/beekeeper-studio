<template>
  <div id="interface" class="interface flex-row">
    <core-sidebar @databaseSelected="databaseSelected" :connection="connection"></core-sidebar>
    <div class="page-content flex-column" id="page-content">
      <core-tabs :connection="connection"></core-tabs>
    </div>
  </div>
</template>

<script>

  import CoreSidebar from './CoreSidebar'
  import CoreTabs from './CoreTabs'

  export default {
    components: { CoreSidebar, CoreTabs },
    props: [ 'connection' ],
    data() {
      return {
      }
    },
    methods: {
      databaseSelected(database) {

      }
    }
  }

</script>
