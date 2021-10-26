<template>
<div class="list-item" @contextmenu.prevent.stop="openContextMenu($event, item)">
  <a class="list-item-btn" @click.prevent="click(item)" :class="{active: selected}">
    <i class="item-icon query material-icons">code</i>
    <div class="list-title flex-col">
      <span class="item-text title truncate expand" :title="item.title">{{item.title}}</span>
      <span class="database subtitle"><span :title="item.database" >{{item.database}}</span></span>
    </div>
  </a>
</div>

</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['item', 'selected']
  
})
</script>