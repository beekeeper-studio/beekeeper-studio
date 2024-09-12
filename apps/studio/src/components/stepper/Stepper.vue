<template>
  <div
    :class="stepperClasses"
    v-if="iSteps.length > 0"
  >
    <div class="top">
      <div class="nav-pills">
        <div
          v-for="(step, index) in iSteps"
          :key="index"
          :class="{ 'deactivated': step.deactivated }"
        >
          <div
            class="progress"
            :class="{ 'passed': index <= currentStepIndex }"
          >
            &nbsp;
          </div>
          <a
            class="nav-pill"
            :class="{ active: index === currentStepIndex, deactivated: step.deactivated }"
            @click.stop.prevent="goToStep(index)"
          >
            {{ index + 1 > currentStepIndex && !step.deactivated ? `${index + 1}.` : '' }}
            <i
              v-if="index + 1 <= currentStepIndex"
              class="material-icons pill-icon"
            >check</i>
            <i
              v-else-if="step.deactivated"
              class="material-icons pill-icon"
            >clear</i>
            {{ step.title }}
          </a>
        </div>
      </div>
    </div>
    <div
      :class="contentClass"
    >
      <keep-alive>
        <component
          :stepper-props="currentStep.stepperProps ? currentStep.stepperProps : {}"
          :ref="`component-${currentStepIndex}`"
          :is="currentStep.component"
          @change="runValidation(true)"
          @finish="nextStep"
        />
      </keep-alive>
    </div>

    <!-- NO PORTAL TARGET -->
    <div
      v-if="buttonPortalTarget === null"
      :class="['bottom', (currentStepIndex > 0) ? '' : 'only-next']"
    >
      <button
        v-if="currentStepIndex > 0"
        class="stepper-button"
        @click="prevStep"
      >
        <i class="material-icons">keyboard_arrow_left</i>
      </button>
      <button
        class="stepper-button next"
        :class="[this.canContinue ? '' : 'deactivated']"
        @click="nextStep"
      >
        <i
          v-if="!iSteps[currentStepIndex].nextButtonText && !iSteps[currentStepIndex].nextButtonIcon"
          class="material-icons"
        >keyboard_arrow_right</i>
        <span v-if="iSteps[currentStepIndex].nextButtonText">{{ iSteps[currentStepIndex].nextButtonText }}</span>
        <i
          v-if="iSteps[currentStepIndex].nextButtonIcon"
          class="next-button-icon material-icons"
        >{{
          iSteps[currentStepIndex].nextButtonIcon }}</i>
      </button>
    </div>

    <!-- PORTAL TARGET PROVIDED -->
    <!-- This should always be a statusbar -->
    <portal
      v-if="buttonPortalTarget"
      :to="buttonPortalTarget"
    >
      <div class="portal">
        <x-button
          v-if="currentStepIndex > 0"
          class="btn btn-flat btn-flex"
          @click="prevStep"
        >
          <i class="material-icons">keyboard_arrow_left</i>
        </x-button>
        <div v-else>
          &nbsp;
        </div>
        <slot name="between-portal-buttons">
          &nbsp;
        </slot>
        <span v-tooltip="tooltip">
          <x-button
            :disabled="continueButtonDisabled"
            :class="currentStepNextButtonClass"
            @click="nextStep"
          >
            <i
              v-if="!currentStep.nextButtonText && !currentStep.nextButtonIcon"
              class="material-icons"
            >keyboard_arrow_right</i>
            <template v-if="currentStep.nextButtonText">
              {{ currentStep.nextButtonText }}
            </template>
            <i
              v-if="currentStep.nextButtonIcon"
              class="next-button-icon material-icons"
            >{{ currentStep.nextButtonIcon
            }}</i>
          </x-button>

        </span>
      </div>
    </portal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PropType } from 'vue'
import { Step } from './models'
import { mapGetters } from 'vuex';

export default Vue.extend({
  components: {

  },
  props: {
    steps: Array as PropType<Array<Step>>,
    buttonPortalTarget: {
      type: String,
      default: null
    },
    wrapperClass: String
  },
  data() {
    return {
      currentStepIndex: 0,
      prevStepIndex: null,
      canContinue: true,
      iSteps: [] // Internal Steps array, for reactivity purposes
    }
  },
  computed: {
    ...mapGetters('settings', ['themeValue']),
    tooltip() {
      if (this.continueButtonDisabled) return this.currentStep.nextButtonDisabledTooltip
      return undefined
    },
    contentClass() {
      const classes = ["content"]
      if (this.buttonPortalTarget) classes.push('with-bottom')
      if (this.wrapperClass) classes.push(this.wrapperClass)
      return classes
    },
    stepperClasses() {
      return `stepper-box theme-${this.themeValue}`
    },
    continueButtonDisabled() {
      if (this.currentStep?.validateOnNext) return false

      return !this.canContinue
    },
    currentStep() {
      return this.iSteps[this.currentStepIndex] || {}
    },
    currentStepNextButtonClass() {
      return {
        'btn': true,
        'btn-primary': true,
        'btn-icon': !!this.currentStep.nextButtonIcon,
        'end': !!this.currentStep.nextButtonIcon,
        'deactivated': !this.canContinue
      }
    }
  },
  methods: {
    async goToStep(index: number) {
      if (this.iSteps[index].deactivated) return;
      await this.callComponentFunction('onNext');
      this.$emit('next', this.currentStepIndex);
      if (index > this.currentStepIndex)
        this.iSteps[this.currentStepIndex].completed = true;
      this.prevStepIndex = this.currentStepIndex;
      this.currentStepIndex = index;

      await Vue.nextTick();
      this.callComponentFunction('onFocus');
      this.runValidation(true);
    },
    async nextStep() {
      this.runValidation();
      if (!this.canContinue) return;

      await this.callComponentFunction('onNext');
      if (this.currentStepIndex === this.iSteps.length - 1) {
        this.$emit('finished');
        return;
      }

      this.prevStepIndex = this.currentStepIndex;

      this.$emit('next', this.currentStepIndex);
      this.currentStepIndex += 1;

      await Vue.nextTick();
      this.callComponentFunction('onFocus');
      this.runValidation(true);
    },
    async prevStep() {
      await this.callComponentFunction('onNext');
      this.prevStepIndex = this.currentStepIndex;
      this.currentStepIndex -= 1;
      this.canContinue = true;

      this.$emit('prev');

      await Vue.nextTick();
      this.callComponentFunction('onFocus');
    },
    callComponentFunction(func: string): any {
      const ref = this.$refs[`component-${this.currentStepIndex}`];

      if (ref && ref[func])
        return ref[func]();
      // for the validation hook
      return true;
    },
    runValidation(evalSteps = false): void {
      // HACK (day): I really don't like this, but the alternative seems hackier.
      // FIXME (matthew): Why can't the component just emit when it's ready?
      this.canContinue = this.callComponentFunction('canContinue');
      this.currentStep.completed = this.canContinue;
      if (!evalSteps) return;

      this.evalSteps();
    },
    evalSteps(): void {
      for (let i = this.currentStepIndex + 1; i < this.iSteps.length; i++) {
        let step: Step = { ...this.iSteps[i] };
        step.deactivated = this.iSteps[i].completePrevious != undefined &&
          this.iSteps[i].completePrevious && !this.iSteps[i - 1].completed;
        Vue.set(this.iSteps, i, step);
      }
    }
  },
  async mounted() {
    this.iSteps = this.steps;
    let prevStepCompleted = false;
    for (let i = 0; i < this.iSteps.length; i++) {
      const step = this.iSteps[i];
      step.deactivated = false;
      step.completed = false;
      if (step.completePrevious || prevStepCompleted) {
        prevStepCompleted = true;
        step.completePrevious = true;
      }

    }
    await Vue.nextTick();
    this.runValidation(true);
  }
});
</script>

<style lang="scss"></style>
