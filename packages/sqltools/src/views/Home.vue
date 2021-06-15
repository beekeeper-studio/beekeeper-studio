<template>
  <div class="home">
    <div class="big-wrap">
      <schema-builder>
        <template>
          <h2>Schema Builder</h2>
        </template>
      </schema-builder>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import SchemaBuilder from '../../../components/src/components/SchemaBuilder.vue';

export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .home {
    padding: 0 ($gutter-w * 2);
  }
  .table-header {
    padding: $gutter-w 0;
    h2 {
      margin: 0;
      color: $text-dark;
    }
  }
</style>