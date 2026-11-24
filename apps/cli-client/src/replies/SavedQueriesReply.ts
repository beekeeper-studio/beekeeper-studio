import { SavedQueriesResult } from "../protocol";
import { CliReply } from "./CliReply";
import { table } from "../markdown";

export class SavedQueriesReply extends CliReply<SavedQueriesResult> {
  markdown(): string {
    const result = this.json();
    if (result.savedQueries.length === 0) {
      return "No saved queries.";
    }
    return table(
      ["Id", "Title", "Excerpt", "Updated"],
      result.savedQueries.map((q) => [q.id, q.title, q.excerpt, q.updatedAt]),
    );
  }
}
