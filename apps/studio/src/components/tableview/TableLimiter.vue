<template>
  <div class="table-limiter" title="Limit rows">
    <input
      v-model="inputValue"
      ref="input"
      @focus="handleFocus"
      @change="$emit('change', Number($event.target.value))"
      @keyup.enter="$emit('change', Number($event.target.value))"
      type="number"
    />
    <x-button class="btn btn-flat" @click="handleOpenMenu" ref="menuTriggerBtn">
      <i class="material-icons">arrow_drop_down</i>
      <x-menu ref="menu">
        <x-menuitem @click="change(1000)">
          <x-label>1000</x-label>
        </x-menuitem>
        <x-menuitem @click="change(500)">
          <x-label>500</x-label>
        </x-menuitem>
        <x-menuitem @click="change(200)">
          <x-label>200</x-label>
        </x-menuitem>
        <x-menuitem @click="change(100)">
          <x-label>100</x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import _ from "lodash";

export default Vue.extend({
  name: "TableLimiter",
  props: ["initialValue"],
  data() {
    return {
      inputValue: this.initialValue || 100,
      preventMenu: false,
    };
  },
  methods: {
    handleOpenMenu() {
      this.preventMenu = true;
      this.$refs.input.focus();
    },
    change(n: number) {
      this.inputValue = n;
      this.$emit("change", n);
    },
    handleFocus() {
      if (this.preventMenu) {
        this.preventMenu = false;
        return;
      }
      // this.$refs.menuTriggerBtn.click();
    },
  },
});
</script>

<style lang="scss" scoped>
.table-limiter::v-deep {
  display: flex;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  height: 26px;
  margin: 0 0.15rem;
  overflow: hidden;
  width: 60px;
  position: relative;

  input {
    border: none;
    border-radius: 0;
    height: 100%;
    padding-left: 0.5rem;
    padding-right: 0;
    z-index: 1;
    width: 2.55rem;
    color: inherit;
  }

  x-button.btn.btn-flat {
    position: absolute;
    display: flex;
    justify-content: flex-end;
    height: 100%;
    width: 100%;
    top: 0;
    right: 0;
    margin: 0;
    padding: 0;
    padding-right: 0.25rem;
    border-radius: 0;
    background: transparent !important;

    & > i {
      opacity: 0.6;
    }

    i {
      margin-right: 0;
    }
  }

  x-menu {
    --align: end;
    min-width: 60px;
  }
}
</style>
