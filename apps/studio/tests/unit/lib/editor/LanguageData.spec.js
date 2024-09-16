import { Languages } from "@/lib/editor/languageData"





describe("LanguageData/HTML/minify", () => {
  test("Should remove html comments properly", () => {
    const input = `<!--<!--- comment --><div>Hi mom</div>`
    const ld = Languages.find((l) => l.name === 'html')

    expect(ld.minify(input)).toEqual("<div>Hi mom</div>")
  })
})
