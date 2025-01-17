import spawn from "cross-spawn";
import fs from "fs";

function build(component) {
  const result = spawn.sync(
    "vite",
    ["build", "--mode", "production", "--emptyOutDir=false"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        COMPONENT: component,
      },
    }
  );
  if (result.err) {
    throw new Error(result.err);
  }
  return result;
}

let result;

fs.rmSync("dist/*", { force: true });

result = build("main");
result = build("table");
result = build("table-list");
result = build("sql-text-editor");
result = build("data-editor");

process.exit(result.status);
