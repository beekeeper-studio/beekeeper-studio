import { Pos } from "codemirror";
import { testAutoquotes as test } from "./helpers";

describe("Codemirror autoquotes", () => {
  test("Lowercased identifier", {
    tables: { Foobar: [] },
    value: "SELECT * FROM Foo",
    cursor: Pos(0, 17),
    completeTo: "foobar",
    result: "SELECT * FROM foobar",
  });

  test("Lowercased identifier, uppercased alias", {
    tables: { foo: ["baz"] },
    value: "SELECT Bar. FROM foo AS Bar",
    cursor: Pos(0, 11),
    completeTo: "Bar.baz",
    result: "SELECT Bar.baz FROM foo AS Bar",
  });

  test("Uppercased identifier", {
    tables: { Foobar: [] },
    value: "SELECT * FROM Foo",
    cursor: Pos(0, 17),
    completeTo: "Foobar",
    result: 'SELECT * FROM "Foobar"',
  });

  test("Uppercased identifier, uppercased alias", {
    tables: { foo: ["Baz"] },
    value: "SELECT Bar. FROM foo AS Bar",
    cursor: Pos(0, 11),
    completeTo: "Bar.Baz",
    result: 'SELECT Bar."Baz" FROM foo AS Bar',
  });
});
