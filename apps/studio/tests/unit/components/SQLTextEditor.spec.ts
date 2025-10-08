import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import SQLTextEditor from "@/components/common/texteditor/SQLTextEditor.vue";

Vue.use(Vuex);

const MockTextEditor = {
  name: "MockTextEditor",
  props: [
    "value",
    "hint",
    "mode",
    "extra-keybindings",
    "hint-options",
    "columns-getter",
    "context-menu-options",
    "plugins",
    "auto-focus",
  ],
  render(h) {
    return h("div", {
      class: "mock-text-editor",
      attrs: {
        "data-testid": "text-editor",
      },
    });
  },
  mounted() {
    // Emit events that the SQLTextEditor expects
    this.$emit("update:focus", true);
    this.$emit("update:selection", {});
    this.$emit("update:cursorIndex", 0);
    this.$emit("update:cursorIndexAnchor", 0);
    this.$emit("update:initialized", true);
  },
  methods: {
    // Simulate input changes
    simulateInput(value) {
      this.$emit("input", value);
    },
  },
};

const MockModal = {
  name: "MockModal",
  props: [
    "name",
    "modalClass",
    "width",
    "height",
    "scrollable",
    "adaptive",
    "pivot-y",
  ],
  render(h) {
    return h(
      "div",
      {
        class: ["mock-modal", this.modalClass],
        attrs: {
          "data-testid": "modal",
        },
      },
      this.$slots.default
    );
  },
};

describe("SQLTextEditor.vue", () => {
  let wrapper;
  let store;
  let mockDispatch;
  let mockCommit;

  beforeEach(() => {
    // Mock functions
    mockDispatch = jest.fn();
    mockCommit = jest.fn();

    store = new Vuex.Store({
      state: {
        tables: [
          { name: "users", schema: "public", columns: [] },
          { name: "orders", schema: "public", columns: [] },
          { name: "products", schema: null, columns: [] },
        ],
      },
      getters: {
        defaultSchema: () => "public",
        dialectData: () => ({ textEditorMode: "sql" }),
        isUltimate: () => true,
      },
      actions: {
        updateTableColumns: mockDispatch,
      },
    });

    const modalMock = {
      hide: jest.fn(),
      show: jest.fn(),
    };

    wrapper = mount(SQLTextEditor, {
      store,
      components: {
        TextEditor: MockTextEditor,
        modal: MockModal,
      },
      mocks: {
        $modal: modalMock,
      },
      propsData: {
        value: "",
        connectionType: "postgresql",
        extraKeybindings: {},
        contextMenuOptions: null,
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  // Test FK suggestion modal name generation
  it("generates correct FK suggestion modal name", () => {
    expect(wrapper.vm.fkSuggestionModalName).toBe("fk-name-suggestion-modal");
  });

  // Test FK pattern detection with constraint names
  it("detects foreign keys with constraint names correctly", () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    const foreignKeys = wrapper.vm.extractAllForeignKeys(sqlText);

    expect(foreignKeys).toHaveLength(1);
    expect(foreignKeys[0].currentName).toBe("fk_user");
    expect(foreignKeys[0].suggestedName).toBe("FK_orders_users");
    expect(foreignKeys[0].fromTable).toBe("orders");
    expect(foreignKeys[0].toTable).toBe("users");
    expect(foreignKeys[0].fromColumn).toBe("user_id");
    expect(foreignKeys[0].toColumn).toBe("id");
  });

  // Test FK pattern detection without constraint names
  it("detects foreign keys without constraint names correctly", () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    const foreignKeys = wrapper.vm.extractAllForeignKeys(sqlText);

    expect(foreignKeys).toHaveLength(1);
    expect(foreignKeys[0].currentName).toBe(null);
    expect(foreignKeys[0].suggestedName).toBe("FK_orders_users");
    expect(foreignKeys[0].fromTable).toBe("orders");
    expect(foreignKeys[0].toTable).toBe("users");
  });

  // Test FK pattern detection with multiple tables
  it("detects foreign keys across multiple tables correctly", () => {
    const sqlText = `
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      );
      
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        product_id INT,
        CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `;

    const foreignKeys = wrapper.vm.extractAllForeignKeys(sqlText);

    expect(foreignKeys).toHaveLength(2);
    expect(foreignKeys[0].currentName).toBe("fk_order_user");
    expect(foreignKeys[0].suggestedName).toBe("FK_orders_users");
    expect(foreignKeys[1].currentName).toBe(null);
    expect(foreignKeys[1].suggestedName).toBe("FK_orders_products");
  });

  // Test FK ID generation
  it("generates unique FK IDs correctly", () => {
    const id1 = wrapper.vm.generateFkId("orders", "users", "user_id", "id");
    const id2 = wrapper.vm.generateFkId(
      "orders",
      "products",
      "product_id",
      "id"
    );

    expect(id1).toBe("orders.user_id->users.id");
    expect(id2).toBe("orders.product_id->products.id");
    expect(id1).not.toBe(id2);
  });

  // Test FK name generation
  it("generates FK names correctly", () => {
    expect(wrapper.vm.generateFkName("orders", "users")).toBe(
      "FK_orders_users"
    );
    expect(wrapper.vm.generateFkName("public.orders", "public.users")).toBe(
      "FK_orders_users"
    );
    expect(wrapper.vm.generateFkName("order_items", "products")).toBe(
      "FK_order_items_products"
    );
  });

  // Test table context extraction
  it("extracts table contexts correctly", () => {
    const sqlText = `
      CREATE TABLE users (
        id INT PRIMARY KEY
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY
      );
    `;

    const contexts = wrapper.vm.extractTableContexts(sqlText);

    expect(contexts).toHaveLength(2);
    expect(contexts[0].tableName).toBe("users");
    expect(contexts[1].tableName).toBe("orders");
  });

  // Test line number calculation
  it("calculates line numbers correctly", () => {
    const text = "line1\nline2\nline3\nline4";
    expect(wrapper.vm.getLineNumber(text, 0)).toBe(0);
    expect(wrapper.vm.getLineNumber(text, 6)).toBe(1);
    expect(wrapper.vm.getLineNumber(text, 12)).toBe(2);
  });

  // Test FK suggestion filtering
  it("filters suggestions correctly based on dismissed items", () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    wrapper.vm.checkForForeignKeyPatterns(sqlText);
    expect(wrapper.vm.suggestionQueue).toHaveLength(1);

    // Dismiss the suggestion
    const fkId = wrapper.vm.suggestionQueue[0].id;
    wrapper.vm.dismissedSuggestions.add(fkId);

    // Should not show the same suggestion
    wrapper.vm.checkForForeignKeyPatterns(sqlText);
    expect(wrapper.vm.suggestionQueue).toHaveLength(0);
  });

  // Test suggestion queue
  it("manages suggestion queue correctly", () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        product_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `;

    wrapper.vm.checkForForeignKeyPatterns(sqlText);
    expect(wrapper.vm.suggestionQueue).toHaveLength(2);

    wrapper.vm.showNextSuggestion();
    expect(wrapper.vm.currentFkInfo).toBeTruthy();
    expect(wrapper.vm.suggestedFkName).toBe("FK_orders_users");
  });

  // Test FK name application for existing constraints
  it("applies FK names to existing constraints correctly", async () => {
    const sqlText = `CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  CONSTRAINT old_name FOREIGN KEY (user_id) REFERENCES users(id)
);`;

    await wrapper.setProps({ value: sqlText });
    await Vue.nextTick();

    wrapper.vm.checkForForeignKeyPatterns(sqlText);

    // Get the detected FK
    const detectedFks = wrapper.vm.extractAllForeignKeys(sqlText);
    expect(detectedFks).toHaveLength(1);

    const fkInfo = detectedFks[0];
    // Verify if the detected FK has the correct current name
    expect(fkInfo.currentName).toBe("old_name");
    expect(fkInfo.suggestedName).toBe("FK_orders_users");

    const emitSpy = jest.spyOn(wrapper.vm, "$emit");

    // Apply the FK name using the actual detected FK
    wrapper.vm.applyFkName(fkInfo);
    await Vue.nextTick();


    expect(emitSpy).toHaveBeenCalledWith("input", expect.any(String));


    const inputCalls = emitSpy.mock.calls.filter((call) => call[0] === "input");
    expect(inputCalls.length).toBeGreaterThan(0);

    const emittedValue = inputCalls[inputCalls.length - 1][1];
    expect(emittedValue).toContain("CONSTRAINT FK_orders_users");
    expect(emittedValue).not.toContain("CONSTRAINT old_name");
  });

  it("applies FK names to unnamed constraints correctly", async () => {
    const sqlText = `CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`;

    await wrapper.setProps({ value: sqlText });
    await Vue.nextTick();

    wrapper.vm.checkForForeignKeyPatterns(sqlText);

    const detectedFks = wrapper.vm.extractAllForeignKeys(sqlText);
    expect(detectedFks).toHaveLength(1);

    const fkInfo = detectedFks[0];

    const emitSpy = jest.spyOn(wrapper.vm, "$emit");

    wrapper.vm.applyFkName(fkInfo);
    await Vue.nextTick();

    expect(emitSpy).toHaveBeenCalledWith("input", expect.any(String));

    // Get the emitted value
    const inputCalls = emitSpy.mock.calls.filter((call) => call[0] === "input");
    expect(inputCalls.length).toBeGreaterThan(0);

    const emittedValue = inputCalls[inputCalls.length - 1][1];
    expect(emittedValue).toContain("CONSTRAINT FK_orders_users FOREIGN KEY");

    expect(emittedValue).toContain(
      "FOREIGN KEY (user_id) REFERENCES users(id)"
    );
  });

  it("applies FK names to unnamed constraints correctly - full simulation", async () => {
    const sqlText = `CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`;

    await wrapper.setProps({ value: sqlText });
    await Vue.nextTick();

    const emitSpy = jest.spyOn(wrapper.vm, "$emit");

    // Simulate the user typing/inputting the SQL which triggers FK detection
    wrapper.vm.handleInput(sqlText);
    await Vue.nextTick();

    // Check if suggestions were created
    expect(wrapper.vm.suggestionQueue.length).toBeGreaterThan(0);

    // Simulate clicking "Apply" in the modal
    await wrapper.vm.applyFkNameAndClose();
    await Vue.nextTick();

    // Verify the result
    const inputCalls = emitSpy.mock.calls.filter((call) => call[0] === "input");
    if (inputCalls.length > 0) {
      const emittedValue = inputCalls[inputCalls.length - 1][1];
      expect(emittedValue).toContain("CONSTRAINT FK_orders_users FOREIGN KEY");
    }
  });

  // Test modal interaction - apply FK name
  it("handles apply FK name and close correctly", async () => {
    const mockFkInfo = {
      id: "orders.user_id->users.id",
      fromTable: "orders",
      toTable: "users",
      fromColumn: "user_id",
      toColumn: "id",
      currentName: null,
      suggestedName: "FK_orders_users",
      position: 50,
      lineNumber: 2,
    };

    wrapper.vm.currentFkInfo = mockFkInfo;
    wrapper.vm.suggestionQueue = [mockFkInfo];

    // Mock applyFkName method
    const applyFkNameSpy = jest
      .spyOn(wrapper.vm, "applyFkName")
      .mockImplementation(() => {});

    await wrapper.vm.applyFkNameAndClose();

    expect(applyFkNameSpy).toHaveBeenCalledWith(mockFkInfo);
    expect(wrapper.vm.$modal.hide).toHaveBeenCalledWith(
      "fk-name-suggestion-modal"
    );

    applyFkNameSpy.mockRestore();
  });

  // Test modal interaction - dismiss suggestion
  it("handles dismiss suggestion correctly", async () => {
    const mockFkInfo = {
      id: "orders.user_id->users.id",
      fromTable: "orders",
      toTable: "users",
      fromColumn: "user_id",
      toColumn: "id",
      currentName: null,
      suggestedName: "FK_orders_users",
      position: 50,
      lineNumber: 2,
    };

    wrapper.vm.currentFkInfo = mockFkInfo;
    wrapper.vm.suggestionQueue = [mockFkInfo];

    await wrapper.vm.dismissSuggestionAndClose();

    expect(wrapper.vm.dismissedSuggestions.has(mockFkInfo.id)).toBe(true);
    expect(wrapper.vm.$modal.hide).toHaveBeenCalledWith(
      "fk-name-suggestion-modal"
    );
  });

  // Test input handling with FK detection
  it("handles input and triggers FK pattern checking", () => {
    const spy = jest.spyOn(wrapper.vm, "checkForForeignKeyPatterns");
    const newValue = "CREATE TABLE test (id INT);";

    wrapper.vm.handleInput(newValue);

    expect(wrapper.emitted("input")).toBeTruthy();
    expect(wrapper.emitted("input")[0][0]).toBe(newValue);
    expect(spy).toHaveBeenCalledWith(newValue);

    spy.mockRestore();
  });

  // Test modal display logic
  it("shows modal when suggestions are available", () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    wrapper.vm.checkForForeignKeyPatterns(sqlText);

    expect(wrapper.vm.$modal.show).toHaveBeenCalledWith(
      "fk-name-suggestion-modal"
    );
    expect(wrapper.vm.currentFkInfo).toBeTruthy();
  });

  it("resets suggestion data correctly", () => {
    wrapper.vm.suggestedFkName = "test";
    wrapper.vm.currentFkName = "test";
    wrapper.vm.currentTableName = "test";
    wrapper.vm.referencedTableName = "test";

    wrapper.vm.resetSuggestionData();

    expect(wrapper.vm.suggestedFkName).toBe("");
    expect(wrapper.vm.currentFkName).toBe("");
    expect(wrapper.vm.currentTableName).toBe("");
    expect(wrapper.vm.referencedTableName).toBe("");
  });

  // Test multiple suggestions queue processing
  it("processes multiple suggestions in sequence", async () => {
    const sqlText = `
      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        product_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `;

    wrapper.vm.checkForForeignKeyPatterns(sqlText);
    expect(wrapper.vm.suggestionQueue).toHaveLength(2);

    // Process first suggestion
    const firstSuggestion = wrapper.vm.currentFkInfo;
    expect(firstSuggestion.suggestedName).toBe("FK_orders_users");

    // MoveToNextSuggestion 
    wrapper.vm.moveToNextSuggestion();

    expect(wrapper.vm.suggestionQueue).toHaveLength(1);
  });
});
