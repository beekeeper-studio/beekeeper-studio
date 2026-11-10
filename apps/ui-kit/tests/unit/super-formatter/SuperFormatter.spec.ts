import Vue from "vue";
import SuperFormatter from "../../../lib/components/super-formatter/SuperFormatter.vue";

const flush = async () => {
  await Vue.nextTick();
  await Vue.nextTick();
};

// Only highlight.js's own token spans may appear in the preview
function foreignElements(code: HTMLElement) {
  return Array.from(code.querySelectorAll("*")).filter(
    (el) => el.tagName !== "SPAN" || !/^hljs-/.test(el.className)
  );
}

async function mount(value: string) {
  const clipboard = { writeText: vi.fn() };
  const vm = new Vue({
    render: (h) => h(SuperFormatter, { props: { value, clipboard } }),
  }).$mount();
  document.body.appendChild(vm.$el);
  await flush();
  const code = vm.$el.querySelector("pre code") as HTMLElement;
  return { vm, code, clipboard };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SuperFormatter preview", () => {
  // The preview must never interpret the query as markup: HTML in the SQL
  // would otherwise run in the renderer.
  it("does not render HTML from a query the formatter can't parse", async () => {
    // Unbalanced parens make sql-formatter throw, so the raw input is shown
    const sql = `SELECT ((( <img src=x onerror="window.pwned=1"> FROM t`;
    const { code } = await mount(sql);

    expect(foreignElements(code)).toEqual([]);
    expect(code.textContent).toContain(`<img src=x onerror="window.pwned=1">`);
  });

  it("does not render HTML from a query that formats successfully", async () => {
    const sql = `SELECT '<img src=x onerror="window.pwned=1">' AS a, '<script>window.pwned=1</script>' AS b FROM t`;
    const { code } = await mount(sql);

    expect(foreignElements(code)).toEqual([]);
    expect(code.textContent).toContain(`<img src=x onerror="window.pwned=1">`);
    expect(code.textContent).toContain(`<script>window.pwned=1</script>`);
  });

  it("does not render HTML when the query changes", async () => {
    const holder = new Vue({
      data: { value: "SELECT 1" },
      render(h) {
        return h(SuperFormatter, { props: { value: (this as any).value } });
      },
    }).$mount();
    document.body.appendChild(holder.$el);
    await flush();

    const payload = `SELECT ((( <img src=x onerror="window.pwned=1">`;
    (holder as any).value = payload;
    await flush();

    const code = holder.$el.querySelector("pre code") as HTMLElement;
    expect(foreignElements(code)).toEqual([]);
    expect(code.textContent).toBe(payload);
  });

  it("renders an empty preview when there is no query", async () => {
    const { code } = await mount(undefined as unknown as string);

    expect(code.textContent).toBe("");
  });

  it("still syntax highlights the preview", async () => {
    const { code } = await mount("SELECT id FROM users WHERE id = 1");

    expect(code.querySelector(".hljs-keyword")).not.toBeNull();
    expect(code.textContent).toContain("SELECT");
  });

  it("copies the formatted SQL, not markup, to the clipboard", async () => {
    const sql = `SELECT '<b>x</b>' AS a`;
    const { vm, clipboard } = await mount(sql);

    (vm.$el.querySelector(".formatter-buttons .btn-flat") as HTMLElement).click();
    await flush();

    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText.mock.calls[0][0]).toContain("'<b>x</b>'");
  });
});
