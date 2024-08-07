<template>
  <portal-target
    name="dropzone"
    multiple
    class="dropzone"
    ref="overlay"
    :data-dragging="dragging"
  />
</template>

<script lang="ts">
import Vue from "vue";
import { isFile } from "@/common/utils";
import { AppEvent } from "@/common/AppEvent";
import { DropzoneEnterEvent, DropzoneDropEvent } from "@/common/dropzone";

export default Vue.extend({
  data() {
    return {
      lastTarget: null,
      dragging: false,
    };
  },
  methods: {
    handleDragEnter(e: DragEvent) {
      if (isFile(e)) {
        this.lastTarget = e.target;

        let prevented = false;

        const event: DropzoneEnterEvent = {
          event: e,
          files: [...e.dataTransfer.files],
          preventDrop: () => {
            prevented = true;
          },
        };

        this.trigger(AppEvent.dropzoneEnter, event);

        if (!prevented) {
          this.dragging = true;
        }
      }
    },
    handleDragLeave(event: DragEvent) {
      event.preventDefault();
      if (event.target === this.lastTarget || event.target === document) {
        this.dragging = false;
      }
    },
    handleDrageOver(event: DragEvent) {
      event.preventDefault();
    },
    handleDrop(e: DragEvent) {
      e.preventDefault();

      if (!this.dragging) {
        return;
      }

      this.dragging = false;

      if (isFile(e)) {
        const event: DropzoneDropEvent = {
          event: e,
          files: [...e.dataTransfer.files],
        };
        this.trigger(AppEvent.dropzoneDrop, event);
      }
    },
  },
  mounted() {
    window.addEventListener("dragenter", this.handleDragEnter);
    window.addEventListener("dragover", this.handleDrageOver);
    window.addEventListener("dragleave", this.handleDragLeave);
    window.addEventListener("drop", this.handleDrop);
  },
  beforeDestroy() {
    window.removeEventListener("dragenter", this.handleDragEnter);
    window.removeEventListener("dragover", this.handleDrageOver);
    window.removeEventListener("dragleave", this.handleDragLeave);
    window.removeEventListener("drop", this.handleDrop);
  },
});
</script>
