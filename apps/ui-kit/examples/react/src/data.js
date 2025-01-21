const cheeses = {
  name: "cheeses",
  schema: "public",
  columns: [
    { field: "id", dataType: "integer", primaryKey: true },
    { field: "name", dataType: "string" },
    { field: "origin_country_id", dataType: "integer", foreignKey: true },
    { field: "cheese_type", dataType: "string" },
    { field: "description", dataType: "text" },
    { field: "first_seen", dataType: "datetime" },
  ],
  // prettier-ignore
  data: [{ "id": 1, "name": "Cheddar", "origin_country_id": 44, "cheese_type": "Hard", "description": "A firm, smooth cheese with a nutty flavor.", "first_seen": "12th Century" }, { "id": 2, "name": "Brie", "origin_country_id": 33, "cheese_type": "Soft", "description": "A soft cheese with a creamy texture and edible rind.", "first_seen": "8th Century" }, { "id": 3, "name": "Gouda", "origin_country_id": 31, "cheese_type": "Semi-Hard", "description": "A mild, yellow cheese made from cow's milk.", "first_seen": "1184" }, { "id": 4, "name": "Parmesan", "origin_country_id": 39, "cheese_type": "Hard", "description": "A granular cheese with a rich, savory flavor.", "first_seen": "13th Century" }, { "id": 5, "name": "Feta", "origin_country_id": 30, "cheese_type": "Soft", "description": "A brined, crumbly cheese made from sheep or goat milk.", "first_seen": "8th Century BC" }],
};

const users = {
  name: "users",
  schema: "public",
  columns: [
    { field: "id", dataType: "integer", primaryKey: true },
    { field: "name", dataType: "string" },
  ],
  data: [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ],
};

const posts = {
  name: "posts",
  schema: "public",
  columns: [
    { field: "id", dataType: "integer", primaryKey: true },
    { field: "title", dataType: "string" },
  ],
  data: [
    { id: 1, title: "How to Learn JavaScript" },
    { id: 2, title: "The Benefits of Morning Walks" },
    { id: 3, title: "Understanding Async/Await" },
  ],
};

const comments = {
  name: "comments",
  schema: "public",
  columns: [
    { field: "id", dataType: "integer", primaryKey: true },
    { field: "comment", dataType: "string" },
  ],
  data: [
    { id: 1, comment: "Great article! Really helpful." },
    { id: 2, comment: "I totally agree with this!" },
    { id: 3, comment: "Could you elaborate on the examples?" },
  ],
};
// Post-User Link (Who posted which post)
const postUser = {
  name: "post_user",
  schema: "public",
  columns: [
    { field: "postId", dataType: "integer", foreignKey: true, toTable: posts },
    { field: "userId", dataType: "integer", foreignKey: true, toTable: users },
  ],
  data: [
    { postId: 1, userId: 1 }, // Alice posted "How to Learn JavaScript"
    { postId: 2, userId: 2 }, // Bob posted "The Benefits of Morning Walks"
    { postId: 3, userId: 3 }, // Charlie posted "Understanding Async/Await"
  ],
};

// Comment-User-Post Link (Who commented on which post)
const commentUserPost = {
  name: "comment_user_post",
  schema: "public",
  columns: [
    {
      field: "commentId",
      dataType: "integer",
      foreignKey: true,
      toTable: comments,
    },
    { field: "postId", dataType: "integer", foreignKey: true, toTable: posts },
    { field: "userId", dataType: "integer", foreignKey: true, toTable: users },
  ],
  data: [
    { commentId: 1, postId: 1, userId: 2 }, // Bob commented on Alice's post
    { commentId: 2, postId: 2, userId: 3 }, // Charlie commented on Bob's post
    { commentId: 3, postId: 3, userId: 1 }, // Alice commented on Charlie's post
  ],
};

export function getTables() {
  return [cheeses, users, posts, comments, postUser, commentUserPost];
}
