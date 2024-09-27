export class Step {
  // A vue component that will be displayed for this step.
  component: any;
  // This will show under the step circle
  title: string;
  // This is the icon that shows within the circle representing the step.
  icon: string;
  // An internal boolean used by the stepper, assign false.
  completed: boolean;
  // Does this step require the previous step to be completed to be activated?
  // If this is true once, all steps after this step will also have this condition.
  completePrevious?: boolean;
  // Override next button text/icon for step.
  nextButtonText?: string;
  nextButtonIcon?: string;
  nextButtonDisabledTooltip?: string;
  // Do not initialize this.
  deactivated?: boolean;
  // props that can be passed down to the component. On the component level, will be passed 
  // to a prop called 'stepperProps'
  stepperProps?: any;
}