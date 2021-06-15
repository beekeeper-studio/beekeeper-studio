<template>
  <div class="components">
    <h1>Components:</h1>
    <div :key="component.name" v-for="component in components" class="component-wrapper">
      <h2>{{component.name}}</h2>
      <component :is="component.component" />
    </div>

  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import SchemaBuilder from './components/SchemaBuilder.vue'
export default Vue.extend({
  data() {
    return {
      components: [
        {
          name: "Schema Builder",
          component: SchemaBuilder
        }
      ]
    }
  }
})
</script>
<style lang="scss" scoped>
.components {
  width: 900px;
  margin: auto;
  .component-wrapper {
    padding: 10px;
    border: 1px solid grey;
    margin-bottom: 20px;
  }

}
</style>