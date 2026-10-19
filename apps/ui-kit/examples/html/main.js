import '@beekeeperstudio/ui-kit/style.css';
import '@beekeeperstudio/ui-kit';
import { getEntities } from "./data.js";

document.addEventListener('DOMContentLoaded', () => {
  const entities = getEntities();
  const textEditor = document.createElement("bks-sql-text-editor");

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
});
