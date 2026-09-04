import TabQueryEditor from "@/components/TabQueryEditor.vue";

// The parameter prompt is decided by a handful of computed properties. The query
// editor is far too entangled to mount here, so these call the computed getters
// against a stand-in vm holding just the state they read.
const computed = (TabQueryEditor as any).computed;

// SQL Server's paramTypes, straight out of default.config.ini
const paramTypes = { positional: false, named: [":"], numbered: [], quoted: [] };

function editorState(overrides: Record<string, any> = {}) {
  const vm: Record<string, any> = {
    dialect: "sqlserver",
    identifierDialect: "mssql",
    paramTypes,
    queryParameterValues: {},
    queryForExecution: null,
    ...overrides,
  };
  // Vue lets one computed read another; wire up the two this component chains.
  for (const name of ["queryParameters", "queryParameterPlaceholders"]) {
    Object.defineProperty(vm, name, { get: () => computed[name].call(vm) });
  }
  return vm;
}

// The join query from #4702 - no placeholders anywhere in it
const joinQuery = [
  "select u.usrRegistration, u.usrName, ud.usdDeviceId, r.Nombre as devAmicoDevId",
  "  from hid_ta_users_devices ud",
  "       join hid_ta_users u on (u.usrRegistration = ud.usdRegistration)",
  "       join rcp_taNRelojes r on (r.RelojId = ud.usdDeviceId)",
  "  --where usdStatus = 0",
  "  order by usrRegistration, usdDeviceId",
].join("\n");

// A tab holding a parameterized statement above the join query. T-SQL's
// statement terminator is optional, so without semicolons the whole tab parses
// as a single statement carrying the :reg placeholder.
const tab = `select * from hid_ta_users where usrRegistration = :reg\n\n${joinQuery}`;

describe("TabQueryEditor parameter prompt", () => {
  it("prompts for the placeholders of the query being run", () => {
    const vm = editorState({ queryForExecution: "select * from users where id = :id" });

    expect(vm.queryParameterPlaceholders).toEqual([":id"]);
    expect(computed.hasParams.call(vm)).toBe(true);
    expect(computed.paramsModalRequired.call(vm)).toBe(true);
  });

  it("stops prompting once every placeholder has a value", () => {
    const vm = editorState({
      queryForExecution: "select * from users where id = :id",
      queryParameterValues: { ":id": "42" },
    });

    expect(computed.paramsModalRequired.call(vm)).toBe(false);
  });

  // Regression for #4702: running a selection prompted for placeholders that
  // only appeared elsewhere in the tab.
  it("does not prompt for placeholders that only exist elsewhere in the tab", () => {
    // Running the whole tab does ask for :reg...
    expect(editorState({ queryForExecution: tab }).queryParameterPlaceholders).toEqual([":reg"]);

    // ...but running only the selected join query asks for nothing.
    const vm = editorState({ queryForExecution: joinQuery });
    expect(vm.queryParameterPlaceholders).toEqual([]);
    expect(computed.hasParams.call(vm)).toBe(false);
  });

  it("prompts for placeholders in every statement of a multi-statement selection", () => {
    const vm = editorState({
      queryForExecution: "select * from a where id = :first;\nselect * from b where id = :second;",
    });

    expect(vm.queryParameterPlaceholders).toEqual([":first", ":second"]);
  });

  it("submits a placeholder-free query verbatim", () => {
    // Nothing to substitute means nothing to reformat either.
    const vm = editorState({ queryForExecution: joinQuery });

    expect(computed.deparameterizedQuery.call(vm)).toBe(joinQuery);
  });

  it("substitutes the values collected for the query being run", () => {
    const vm = editorState({
      queryForExecution: "select * from users where usrRegistration = :reg",
      queryParameterValues: { ":reg": "'A100'" },
    });

    const result = computed.deparameterizedQuery.call(vm);
    expect(result).not.toContain(":reg");
    expect(result).toContain("'A100'");
  });
});
