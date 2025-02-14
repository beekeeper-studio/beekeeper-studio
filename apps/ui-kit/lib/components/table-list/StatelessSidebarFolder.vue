<template>
  <div
    class="list-item schema-item"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <div
      class="folder-group schema"
    >
      <a
        class="folder-btn"
        :class="{'open': expanded}"
        role="button"
        @click.prevent="$emit('expand', $event)"
      >
        <span class="btn-fab open-close">
          <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
        </span>
        <i
          title="Schema"
          class="schema-icon item-icon material-icons"
        >folder</i>
        <span
          class="table-name truncate expand"
          :title="schema"
        >{{ schema }}</span>
      </a>
    </div>
  </div>
</template>

<script lang="ts">
	export default {
    props: ["schema", "expanded"],
	}
</script>
