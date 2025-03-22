<template>
  <div class="save-connection expand">
    <h3 class="dialog-c-title">
      {{ $t('connection.saveConnection') }}
    </h3>
    <div class="form-group">
      <input
        class="form-control"
        ref="nameInput"
        @keydown.enter.prevent.stop="save"
        type="text"
        v-model="config.name"
        :placeholder="$t('connection.connectionName')"
      >
    </div>

    <div class="row flex-middle">
      <label
        class="checkbox-group"
        for="rememberPassword"
      >
        <input
          class="form-control"
          id="rememberPassword"
          type="checkbox"
          name="rememberPassword"
          v-model="config.rememberPassword"
        >
        <span>{{ $t('connection.savePasswords') }}</span>
        <i
          class="material-icons"
          v-tooltip="$t('connection.encryptedPasswordsTooltip')"
        >help_outlined</i>
      </label>
      <span class="expand" />
      <ColorPicker
        :value="config.labelColor"
        v-model="config.labelColor"
      />
    </div>

    <div class="save-actions">
      <button
        v-if="canCancel"
        class="btn btn-flat"
        @click.prevent="$emit('cancel')"
      >
        {{ $t('common.cancel') }}
      </button>
      <button
        class="btn btn-primary save"
        @click.prevent="save"
      >
        {{ $t('common.save') }}
      </button>
    </div>
  </div>
</template>
<script>
import ColorPicker from '../common/form/ColorPicker.vue';
export default {
  components: { ColorPicker },
  props: ['config', 'canCancel', 'selectInput'],
  mounted(){
    if(this.selectInput) {
      const $input = this.$refs.nameInput
      $input.focus()
      const len = $input.value.length
      $input.setSelectionRange(len, len)
    }
  },
  methods: {
    save() {
      this.$emit('save', this.config)
    }
  }
}
</script>
