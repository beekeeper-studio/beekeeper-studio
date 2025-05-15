<template>
  <div class="plugin-page-container">
    <div class="header">
      <div class="title">
        {{ plugin.name }}
      </div>
      <div class="author">
        {{ plugin.author }}
      </div>
      <div class="description">
        {{ plugin.description }}
      </div>
      <div class="actions">
        <template v-if="plugin.installed">
          <!-- TODO we dont support disabling yet -->
          <x-button
            v-if="plugin.enabled"
            @click.prevent="$emit('disable')"
            disabled
            class="btn btn-primary"
          >
            <x-label>Disable</x-label>
          </x-button>
          <x-button
            v-else
            @click.prevent="$emit('enable')"
            class="btn btn-primary"
          >
            <x-label>Enable</x-label>
          </x-button>
          <x-button @click.prevent="$emit('uninstall')" class="btn btn-primary">
            <x-label>Uninstall</x-label>
          </x-button>
        </template>
        <x-button
          v-else
          @click.prevent="$emit('install')"
          class="btn btn-primary"
          :disabled="plugin.installing"
        >
          <x-label>{{ plugin.installing ? "Installing..." : "Install" }}</x-label>
        </x-button>
      </div>
    </div>
    <div class="markdown-content">
      <div v-html="rawHtmlContent" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import DOMPurify from "dompurify";
import { CommonPluginInfo } from "@/services/plugin/types";
import { marked } from "marked";

export default Vue.extend({
  name: "PluginPage",
  props: {
    plugin: {
      type: Object as PropType<CommonPluginInfo>,
      required: true,
    },
    markdown: {
      type: String,
    },
  },
  computed: {
    rawHtmlContent() {
      if (!this.markdown) return "";
      return DOMPurify.sanitize(marked.parse(this.markdown, { async: false }));
    },
  },
});
</script>
