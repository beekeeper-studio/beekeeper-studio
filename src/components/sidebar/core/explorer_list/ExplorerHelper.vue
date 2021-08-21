<template>
  <div class="helper-wrapper">
    <div class="information">Select workspace to get started</div>

    <div class="shortcuts">
      <div class="shortcut-item">
        <div>Create Workspace</div>
        <div class="shortcut" v-if="$config.isMac">
          <span>⌘</span><span>N</span>
        </div>
        <div class="shortcut" v-else><span>Ctrl</span><span>N</span></div>
      </div>
      <div class="shortcut-item">
        <div>Select Workspace</div>
        <div class="shortcut">
          <span>LMB</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script type="text/javascript">
export default {
  data() {
    return {};
  }
};
</script>

<style lang="scss" scoped>
.helper-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
