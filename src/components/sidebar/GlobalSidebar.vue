<template>
  <div class="global-items">
    <a
      href=""
      @click.prevent="click('tables')"
      class="nav-item"
      :class="{ active: activeItem === 'tables' }"
      title="Database"
    >
      <span class="bk-database"></span>
    </a>
    <a
      href=""
      @click.prevent="click('queries')"
      class="nav-item"
      :class="{ active: activeItem === 'queries' }"
      title="Saved queries"
    >
      <span class="material-icons">star</span>
    </a>
    <a
      href=""
      @click.prevent="click('history')"
      class="nav-item"
      :class="{ active: activeItem === 'history' }"
      title="Run history"
    >
      <span class="material-icons">history</span>
    </a>
  </div>
</template>

<script>
export default {
  props: ["activeItem"],
  computed: {},
  methods: {
    click(item) {
      if (this.activeItem === item) {
        this.$emit("toggleSidebar");
      } else {
        this.$emit("selected", item);
      }
    }
  }
};
</script>
