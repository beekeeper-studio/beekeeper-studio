<template>
  <div class="home">

    <div class="small-wrap">
      <select name="dialect" v-model="dialect" id="dialect-select">
        <option v-for="d in dialects" :key="d" :value="d">{{d}}</option>
      </select>
      <schema-builder
        :initialSchema="schema"
        :initialName="name"
        :resetOnUpdate="true"
      >
        <template>
          <span class="table-title">Schema Builder</span>
        </template>
      </schema-builder>
    </div>
  </div>
</template>

<script lang="ts">

import Vue from 'vue';
import { UserTemplate as users } from '../lib/templates/index'
import SchemaBuilder from '@shared/components/SchemaBuilder.vue'
import { Dialect, Dialects } from '@shared/lib/dialects/models';

interface Data {
  name: string
  dialect: Dialect,
  dialects: Dialect[]
}
export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder
  },
  data(): Data {
    return {
      dialects: [...Dialects],
      dialect: 'postgresql',
      name: users.name
    }
  },
  computed: {
    schema() {
      return users.toSchema(this.dialect)
    }
  },
  mounted() {
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