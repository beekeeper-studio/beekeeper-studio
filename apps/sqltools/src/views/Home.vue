<template>
  <div class="home">
    <div class="big-wrap">
      <schema-builder
        :initialSchema="schema"
        :initialName="name"
      >
        <template>
          <span class="table-title">Schema Builder</span>
        </template>
      </schema-builder>
    </div>
  </div>
</template>

<script lang="ts">
import { SchemaItem } from '@shared/lib/dialects/models';
import Vue from 'vue';
import { UserTemplate as users } from '../lib/templates/index'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'

interface Data {
  schema: SchemaItem[],
  name: string
}
export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder
  },
  data(): Data {
    return {
      schema: users.schema,
      name: users.name
    }
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
    .table-title {
      font-weight: bold;
      font-size: 1.25rem;
      margin: 0;
      color: $text-dark;
    }
  }
</style>