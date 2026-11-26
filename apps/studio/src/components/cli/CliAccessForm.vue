<template>
  <div class="cli-access-form">
    <label class="checkbox-group cli-access-always">
      <input
        type="checkbox"
        checked
        disabled
      >
      <span>Schemas and table structure</span>
    </label>

    <fieldset class="cli-access-box">
      <legend>Query types the CLI may run</legend>
      <div class="cli-access-grid">
        <label
          v-for="type in queryTypes"
          :key="type.value"
          class="checkbox-group"
          :title="isBlocked(type.value) ? 'Not available on a read only connection' : null"
        >
          <input
            type="checkbox"
            :checked="hasQueryType(type.value)"
            :disabled="disabled || isBlocked(type.value) || (type.value !== 'anything' && allowsAnything)"
            @change="toggleQueryType(type.value, $event.target.checked)"
          >
          <span>{{ type.label }}</span>
        </label>
      </div>
      <p
        v-if="readOnlyMode"
        class="cli-access-note"
      >
        Read only connection: write statements stay blocked.
      </p>
    </fieldset>

    <fieldset class="cli-access-box">
      <legend>Also allow</legend>
      <div class="cli-access-group">
        <span class="cli-access-group-label">Saved queries</span>
        <label class="checkbox-group">
          <input
            type="checkbox"
            :checked="value.savedQueriesRead"
            :disabled="disabled"
            @change="update({ savedQueriesRead: $event.target.checked })"
          >
          <span>Read</span>
        </label>
        <label class="checkbox-group">
          <input
            type="checkbox"
            :checked="value.savedQueriesWrite"
            :disabled="disabled"
            @change="update({ savedQueriesWrite: $event.target.checked })"
          >
          <span>Create and edit</span>
        </label>
      </div>
      <label class="checkbox-group">
        <input
          type="checkbox"
          :checked="value.openTabs"
          :disabled="disabled"
          @change="update({ openTabs: $event.target.checked })"
        >
        <span>Open and switch tabs</span>
      </label>
    </fieldset>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import type { Access, QueryPermission } from "@beekeeperstudio/cli";

const WRITE_TYPES: QueryPermission[] = ["update", "delete", "alter", "anything"];

export default Vue.extend({
  props: {
    value: {
      type: Object as PropType<Access>,
      required: true,
    },
    readOnlyMode: Boolean,
    disabled: Boolean,
  },
  data() {
    return {
      queryTypes: [
        { value: "select", label: "SELECT" },
        { value: "explain-analyze", label: "EXPLAIN ANALYZE" },
        { value: "update", label: "UPDATE" },
        { value: "delete", label: "DELETE" },
        { value: "alter", label: "ALTER" },
        { value: "anything", label: "Allow anything" },
      ] as { value: QueryPermission; label: string }[],
    };
  },
  computed: {
    allowsAnything(): boolean {
      return this.value.queryTypes.includes("anything");
    },
  },
  methods: {
    isBlocked(type: QueryPermission): boolean {
      return this.readOnlyMode && WRITE_TYPES.includes(type);
    },
    hasQueryType(type: QueryPermission): boolean {
      if (this.isBlocked(type)) {
        return false;
      }
      return this.allowsAnything || this.value.queryTypes.includes(type);
    },
    toggleQueryType(type: QueryPermission, checked: boolean) {
      const others = this.value.queryTypes.filter((t) => t !== type);
      this.update({ queryTypes: checked ? [...others, type] : others });
    },
    update(patch: Partial<Access>) {
      this.$emit("input", { ...this.value, ...patch });
    },
  },
});
</script>

<style lang="scss" scoped>
.cli-access-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cli-access-box {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem 0.75rem 0.75rem;
  margin: 0;

  legend {
    padding: 0 0.25rem;
    font-size: 0.85rem;
  }
}

.cli-access-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem 1rem;
}

.cli-access-group {
  margin-bottom: 0.5rem;

  .checkbox-group {
    margin-left: 1.25rem;
  }
}

.cli-access-group-label {
  display: block;
  margin-bottom: 0.25rem;
}

.cli-access-always {
  opacity: 0.7;
}

.cli-access-note {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
