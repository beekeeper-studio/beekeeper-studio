<template>
  <div class="header-button btn btn-flat">
    <button @mousedown.prevent="click" class="header-button-button">{{item.label}}</button>
    <div v-show="active">
      <slot></slot>
    </div>
  </div>
</template>
<script>
export default {
  props: ['item'],
  data: () => ({
    active: false
  }),
  methods: {
    click() {
      this.active = !this.active
    }
  }
}
</script>
