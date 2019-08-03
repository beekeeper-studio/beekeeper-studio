<template>
  <div class="interface flex-row">
    <core-sidebar></core-sidebar>
    <div class="page-content flex-column" id="page-content">
      <core-tabs></core-tabs>
    </div>
  </div>
</template>

<script>

  import CoreSidebar from './CoreSidebar'
  import CoreTabs from './CoreTabs'

  export default {
    components: { CoreSidebar, CoreTabs },
    data() {
      return {
        connection: null,
      }
    },
  }

</script>
