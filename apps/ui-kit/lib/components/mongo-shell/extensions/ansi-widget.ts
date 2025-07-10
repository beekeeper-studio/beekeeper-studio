import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";

export class AnsiOutputWidget extends WidgetType {
  private html: string;

  constructor(html: string) {
    super();
    this.html = html;
  }

  toDOM() {
    const el = document.createElement('pre');
    el.className = 'ansi-output';
    el.innerHTML = this.html;
    return el;
  }
}

export const addOutputEffect = StateEffect.define<{pos: number, html: string}>();

export const OutputField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);

    for (let effect of tr.effects) {
      if (effect.is(addOutputEffect)) {
        const { pos, html } = effect.value;
        const decoToAdd = Decoration.widget({
          widget: new AnsiOutputWidget(html),
          block: true
        }).range(pos);
        deco = deco.update({ add: [decoToAdd]});
      }
    }

    return deco;
  },
  provide: f => EditorView.decorations.from(f)
})
