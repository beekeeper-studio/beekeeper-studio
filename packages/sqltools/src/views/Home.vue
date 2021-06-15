<template>
  <div class="home">
    <div class="big-wrap">
      <div class="card-flat">
        <schema-builder/>
      </div>
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
</style>