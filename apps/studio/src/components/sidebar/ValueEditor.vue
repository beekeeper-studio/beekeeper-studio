<template>
  <div class="value-editor">
    <div class="value-editor-content" v-if="hasValue">
      <div class="value-type-info">
        <span class="value-type">{{ valueType }}</span>
        <span class="value-size" v-if="valueSize">{{ valueSize }}</span>
      </div>

      <div class="value-input">
        <textarea
          v-model="editedValue"
          :placeholder="`Enter ${valueType} value...`"
          class="value-textarea"
          :class="{ 'has-changes': hasChanges }"
          @input="onValueChange"
        />
      </div>
    </div>

    <div class="value-editor-empty" v-else>
      <p>Select a cell to edit its value</p>
    </div>
  </div>
</template>

<script>
import { debounce } from 'lodash'

export default {
  name: "ValueEditor",
  props: {
    // Self-contained data structure with everything needed for editing
    valueContext: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      editedValue: "",
      originalValue: "",
      hasChanges: false,
    };
  },
  computed: {
    // Check if we have any data to edit
    hasValue() {
      return this.valueContext && this.valueContext.value !== null;
    },

    // Get the current value being edited
    currentValue() {
      return this.valueContext?.value;
    },

    // Check if this is a cell value vs KV store value
    isCellValue() {
      return this.valueContext?.kind === "cell";
    },

    // Determine the type of value we're editing
    valueType() {
      const value = this.currentValue;
      if (value === null) return "NULL";
      if (typeof value === "string") return "String";
      if (Array.isArray(value)) return "Array";
      if (typeof value === "object") return "Object";
      if (typeof value === "number") return "Number";
      if (typeof value === "bigint") return "BigInt"
      if (typeof value === "boolean") return "Boolean";
      return "Unknown";
    },

    // Calculate value size for display
    valueSize() {
      const value = this.currentValue;
      if (value === null) return null;

      if (typeof value === "string") {
        return `${value.length} chars`;
      }
      if (Array.isArray(value)) {
        return `${value.length} items`;
      }
      if (typeof value === "object") {
        return `${Object.keys(value).length} keys`;
      }
      return null;
    },
  },
  watch: {
    valueContext: {
      handler() {
        this.updateEditedValue();
      },
      immediate: true,
    },
  },
  methods: {
    updateEditedValue() {
      const value = this.currentValue;
      if (value !== null) {
        this.originalValue = this.formatValueForEditing(value);
        this.editedValue = this.originalValue;
        this.hasChanges = false;
      } else {
        this.originalValue = "";
        this.editedValue = "";
        this.hasChanges = false;
      }
    },

    formatValueForEditing(value) {
      if (value === null) {
        return "";
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
        return value;
      }

      console.log('[debug]', { value })

      return JSON.stringify(value, null, 2);
    },

    onValueChange() {
      this.hasChanges = this.editedValue !== this.originalValue;

      // Debounce the change emission to avoid excessive updates
      this.debouncedEmitChange();
    },

    emitChange() {
      if (this.hasChanges) {
        // Emit minimal data - just the new value and identifier
        if (this.valueContext.kind === "kv") {
          this.$emit("value-editor-change", {
            newValue: this.editedValue,
            key: this.valueContext.key,
          });
        } else if (this.valueContext.kind === "cell") {
          this.$emit("value-editor-change", {
            newValue: this.editedValue,
            column: this.valueContext.column,
          });
        }
      }
    },
  },
  created() {
    // Create debounced function with 500ms delay
    this.debouncedEmitChange = debounce(this.emitChange, 500);
  },
};
</script>

<style scoped>
.value-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.value-editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.value-type-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.value-type {
  font-weight: 600;
  color: var(--brand-color);
}

.value-input {
  flex: 1;
  margin-bottom: 16px;
}

.value-textarea {
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  resize: vertical;
  background: var(--bg-base);
  color: var(--text-base);
}

.value-textarea:focus {
  outline: none;
  border-color: var(--brand-color);
  box-shadow: 0 0 0 2px var(--brand-color-alpha);
}

.value-textarea.has-changes {
  border-color: var(--warning-color);
}

.value-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--brand-color);
  color: white;
}

.btn-primary:hover {
  background: var(--brand-color-dark);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-base);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.value-editor-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
