<template>
  <div class="wrapper">
    <core-sidebar></core-sidebar>
    <div id="page-content-wrapper">
      <core-tabs :connection="connection"></core-tabs>
    </div>
  </div>
</template>

<script>

  import CoreSidebar from './CoreSidebar'
  import CoreTabs from './CoreTabs'

  export default {
    components: { CoreSidebar, CoreTabs },
    props: [ 'connection' ]
    data() {
      return {
      }
    },
  }

</script>
