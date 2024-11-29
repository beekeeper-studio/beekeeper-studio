<template>
  <text-editor
    :keymap="userKeymap"
    :vimKeymaps="vimKeymaps"
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script lang="ts">
import { TextEditor } from "@bks/ui-kit";
import { getKeybindingsFromVimrc } from "@/lib/editor/vim";

export default {
  components: { TextEditor },
  data() {
    return {
      vimKeymaps: [],
    };
  },
  computed: {
    userKeymap() {
      const settings = this.$store.state.settings?.settings;
      const value = settings?.keymap?.value;
      return value && this.$config.defaults.keymapTypes.map((k) => k.value).includes(value)
        ? value
        : "default";
    },
  },
  async mounted() {
    this.vimKeymaps = await getKeybindingsFromVimrc();
  },
};
</script>
