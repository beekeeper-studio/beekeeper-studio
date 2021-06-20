<template>
  <div class="explorer-list">
    <div>
      <a href="" v-for="item in something" :key="item"> {{ item }} </a>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      something: ["first", "second", "third"]
    };
  }
};
</script>

<style></style>
