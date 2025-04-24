import '@beekeeperstudio/ui-kit/style.css';
import '@beekeeperstudio/ui-kit';
import { getEntities } from "./data.js";

document.addEventListener('DOMContentLoaded', () => {
  const entities = getEntities();
  const textEditor = document.createElement("bks-sql-text-editor");
  const table = document.querySelector("bks-table");
  const entityList = document.querySelector("bks-entity-list");
  const dataEditor = document.querySelector("bks-data-editor");

  textEditor.value = "select * from users u where u";
  textEditor.entities = entities;
  textEditor.lsConfig = {
      languageId: "typescript",
      transport: {
        wsUri: "ws://localhost:3000/server",
      },
      rootUri: "/home/user/dev/beekeeper-studio/apps/ui-kit/tests/fixtures/",
      documentUri: "/home/user/dev/beekeeper-studio/apps/ui-kit/tests/fixtures/test.sql",
    }
  document.querySelector('#sql-text-editor-card').appendChild(textEditor);

  table.columns = entities[0].columns;
  table.data = entities[0].data;

  entityList.entities = entities;
  entityList.addEventListener("bks-entity-dblclick", (e) => {
    const idx = entities.findIndex((t) => t === e.detail.entity);
    if (idx > -1) {
      table.data = entities[idx].data;
      table.columns = entities[idx].columns;
    }
  });

  dataEditor.entities = entities;
  dataEditor.addEventListener("bks-query-submit", (event) => {
    dataEditor.setTable({
      name: "result",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
      data: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
    });
  });
});
