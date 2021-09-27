<template>
    <div class="workspace global-items">
      <a
        class="nav-item active"
        title="Personal Workspace"
      >
        <span class="avatar"><i class="material-icons">person</i></span>
      </a>
      <div class="divider"><hr></div>
      <a
        class="nav-item"
        title="Workspace"
      >
        <span class="avatar">Te</span>
      </a>
      <a
        class="nav-item"
        title="Add Workspace"
      >
        <span class="material-icons">add</span>
      </a>
    </div>
</template>

<script>

  export default {
    props: ['activeItem'],
    computed: {
    },
    methods: {
      // click(item) {
      //   if( this.activeItem === item ){
      //     this.$emit('toggleSidebar')
      //   } else {
      //     this.$emit('selected', item)
      //   }
      // }
    }
  }
</script>
