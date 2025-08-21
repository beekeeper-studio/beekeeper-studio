import { StateField, StateEffect } from '@codemirror/state';

// State effects for updating prompt values
export const setPromptLineEffect = StateEffect.define<number>();
export const setPromptSymbolEffect = StateEffect.define<string>();

// State fields for prompt tracking
export const PromptLineField = StateField.define<number>({
  create: () => 0,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setPromptLineEffect)) {
        return effect.value;
      }
    }
    return value;
  }
});

export const PromptSymbolField = StateField.define<string>({
  create: () => '',
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setPromptSymbolEffect)) {
        return effect.value;
      }
    }
    return value;
  }
});