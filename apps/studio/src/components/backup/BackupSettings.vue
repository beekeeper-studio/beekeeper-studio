<template>
  <div class="backup-wrapper small-wrap">
    <div class="backup-content">
      <form v-if="config != null && sections != null">
        <div class="page-content flex-col">
          <div
            v-for="(section, sectionIndex) of sections"
            :key="sectionIndex"
            class="row"
          >
            <div
              v-if="section.show === undefined || section.show(config)"
              class="card-flat padding section expand"
            >
              <div class="flex flex-between">
                <h3 class="card-title">
                  {{ section.header }}
                </h3>
              </div>
              <div
                v-for="(control, index) of section.controls"
                :key="index"
              >
                <div v-if="control.show === undefined || control.show(config)">
                  <div
                    v-if="control.controlType === 'select'"
                    class="form-group"
                  >
                    <label :for="control.settingName">{{ control.settingDesc + (control.required ? '*' : '') }}</label>
                    <div class="input-group">
                      <select
                        :name="control.settingName"
                        class="form-control custom-select"
                        :class="{ 'selected': !!config[control.settingName] }"
                        :id="control.settingName"
                        @change="onChange(control)"
                        v-model="config[control.settingName]"
                      >
                        <option
                          disabled
                          selected
                          hidden
                          value="null"
                        >
                          {{ control.placeholder }}
                        </option>
                        <option
                          :key="o.value"
                          v-for="o in control.selectOptions"
                          :value="o.value"
                        >
                          {{ o.name }}
                        </option>
                      </select>
                      <div
                        v-if="!control.required"
                        class="input-group-append"
                      >
                        <a
                          class="btn btn-flat"
                          @click="clearControl(control.settingName)"
                        > <i
                          class="material-icons"
                        >clear</i> </a>
                      </div>
                    </div>
                  </div>
                  <div
                    v-else-if="control.controlType === 'checkbox'"
                    class="form-group"
                  >
                    <label
                      :for="control.settingName"
                      class="checkbox-group"
                    >
                      <input
                        type="checkbox"
                        :name="control.settingName"
                        class="form-control"
                        :id="control.settingName"
                        @change="onChange(control)"
                        v-model="config[control.settingName]"
                      >
                      <span>{{ control.settingDesc + (control.required ? '*' : '') }}</span>
                    </label>
                  </div>
                  <div
                    v-else-if="control.controlType === 'filepicker'"
                    class="form-group"
                  >
                    <label :for="control.settingName">{{ control.settingDesc + (control.required ? '*' : '') }}</label>
                    <file-picker
                      v-model="config[control.settingName]"
                      @input="onChange(control)"
                      :options="control.controlOptions"
                      :button-text="control.placeholder"
                    >
                      <template
                        v-if="control.actions && control.actions.length > 0"
                        #actions
                      >
                        <div
                          class="input-group-append"
                          v-for="(action, aIndex) in control.actions.filter((a) => !a.show || a.show(config))"
                          :key="aIndex"
                        >
                          <a
                            type="button"
                            class="btn btn-flat"
                            v-tooltip="action.tooltip"
                            :disabled="callIfFunction(action.disabled)"
                            @click="handleAction(action.onClick, control)"
                          >
                            <i
                              class="material-icons btn-icon"
                              v-if="action.icon"
                            >{{ callIfFunction(action.icon) }}</i>
                            <span v-if="action.value">{{ callIfFunction(action.value) }}</span>
                          </a>
                        </div>
                      </template>
                    </file-picker>
                  </div>
                  <div
                    v-else-if="control.controlType === 'input'"
                    class="form-group"
                  >
                    <label :for="control.settingName">{{ control.settingDesc + (control.required ? '*' : '') }}</label>
                    <div class="input-group">
                      <input
                        type="text"
                        :name="control.settingName"
                        :id="control.settingName"
                        @change="onChange(control)"
                        v-model="config[control.settingName]"
                      >
                      <div
                        class="input-group-append"
                        v-if="!control.required"
                      >
                        <a
                          class="btn btn-flat"
                          @click="clearControl(control.settingName)"
                        > <i
                          class="material-icons"
                        >clear</i> </a>
                      </div>
                      <div
                        class="input-group-append"
                        v-for="(action, aIndex) in control.actions"
                        :key="aIndex"
                      >
                        <a
                          type="button"
                          class="btn btn-flat"
                          v-tooltip="action.tooltip"
                          :disabled="callIfFunction(action.disabled)"
                          @click="handleAction(action.onClick, control)"
                        >
                          <i
                            class="material-icons"
                            v-if="action.icon"
                          >{{ callIfFunction(action.icon) }}</i>
                          <span v-if="action.value">{{ callIfFunction(action.value) }}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div
                    v-else-if="control.controlType === 'textarea'"
                    class="form-group"
                  >
                    <label :for="control.settingName">{{ control.settingDesc + (control.required ? '*' : '') }}</label>
                    <textarea
                      :name="control.settingName"
                      cols="30"
                      rows="5"
                      class="gutter textarea"
                      @change="onChange(control)"
                      v-model="config[control.settingName]"
                    />
                  </div>
                  <div
                    v-else-if="control.controlType === 'header'"
                    class="form-group"
                  >
                    <hr>
                    <h3>{{ control.settingDesc }}</h3>
                  </div>
                  <div
                    v-else-if="control.controlType === 'info'"
                    class="form-group"
                  >
                    <div class="info-alert alert text-info">
                      <div class="alert-body">
                        <div>
                          {{ control.settingDesc }}
                          <a
                            class="info-link"
                            v-if="control.infoLink"
                            :href="control.infoLink"
                          >{{ control.infoLinkText }}</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters, mapState } from 'vuex';
import FilePicker from '@/components/common/form/FilePicker.vue'
import { CommandSettingControl, CommandSettingSection } from '@/lib/db/models';
import _ from 'lodash';

export default Vue.extend({
  props: [],
  components: {
    FilePicker,
  },
  data() {
    return {
      sections: [] as Array<CommandSettingSection>
    }
  },
  watch: {
  },
  computed: {
    ...mapGetters('backups', {
      'supportedFeatures': 'supportedFeatures',
      'config': 'settingsConfig'
    }),
    ...mapState(['database']),
    filePickerOptions() {
      return { buttonLabel: 'Choose Directory', properties: ['openDirectory', 'createDirectory'] };
    },
    controls() {
      return _.flatten(this.sections.map((x) => x.controls));
    }
  },
  methods: {
    // Some control properties can be just a static value, or a function taking a config and returning a value
    // this simplifies figuring that out in the template
    callIfFunction(value: any): any {
      if (_.isFunction(value)) {
        return value(this.config);
      } else {
        return value;
      }
    },
    async onNext() {
      await this.$store.commit('backups/updateConfig', this.config);
      await this.$store.commit('backups/setDatabase', this.database);
    },
    canContinue() {
      let cont = true;
      const required = this.controls.filter((c: CommandSettingControl) => c.required && (!c.show || c.show(this.config)));
      required.forEach((c: CommandSettingControl) => {
        cont = cont && !!this.config[c.settingName] && (!c.valid || c.valid(this.config))
      });
      return cont;
    },
    onChange(control: CommandSettingControl) {
      // if the control needs to do any changes to other parts of the config when it changes.
      if (control?.onValueChange) control.onValueChange(this.config);

      // Force settings that have a show method to be redrawn.
      const needsUpdate: [CommandSettingSection, number][] = this.sections
        .map((s, i) => [s, i])
        .filter((s) => s[0].show != undefined || s[0].controls.some((c) => c.show != undefined));
      needsUpdate.forEach((value) => {
        Vue.set(this.sections, value[1], { ...value[0] });
      });

      // We only emit a change event when the field that was changed is required.
      if (control?.required)
        this.$emit('change');
    },
    clearControl(settingName: string) {
      this.config[settingName] = null;
      this.onChange();
    },
    async handleAction(actionOnClick: any, control: CommandSettingControl): Promise<void> {
      if (!actionOnClick) return;
      await actionOnClick(this.config);

      this.onChange(control);
    }
  },
  mounted() {
    this.sections = this.$store.getters['backups/settingsSections'];
  }
})
</script>

<style lang="scss" scoped>
@import '../../assets/styles/app/_variables';

.alert.info-alert {
  display: flex;
  min-width: 200px;
  flex-direction: column;
  position: relative;

  .close-button {
    position: absolute;
    top: 5px;
    right: 5px;
  }

  .alert-title {
    display: flex;
    flex-direction: row;
    align-items: center;

    i {
      margin-right: 5px;
    }
  }

  .alert-body {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    flex-direction: column;
    flex-grow: 1;
    line-height: 18px;
    padding-top: 0;

    i {
      line-height: 28px;
    }

    .info-link {
      padding-left: 0;
    }
  }

  a {
    font-weight: 600;
    margin-top: calc($gutter-h / 2);
    padding-left: $gutter-w;
  }

  &:hover {
    cursor: pointer;
  }
}

.textarea {
  resize: none;
  height: 10rem;
}

.btn-icon {
  margin-right: 5px;
}

.section {
  margin-top: 2rem;
}
</style>
