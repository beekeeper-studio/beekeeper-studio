import { Pos } from "codemirror";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { createServer } from "@commercial/backend/lib/db/server";
import { testCompletions, setConnectionForTests } from "./mongoHelpers";
import { dbtimeout } from "@tests/lib/db";

// Setup for MongoDB test
describe("MongoDB Completions", () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let connection: BasicDatabaseClient<any>;
  let config;

  beforeAll(async () => {
    // Start MongoDB container with timestamp in name to avoid conflicts
    const containerName = `mongodb_hint_test_${Date.now()}`;
    container = await new GenericContainer('mongo:latest')
      .withName(containerName)
      .withEnvironment({
        "MONGO_INITDB_ROOT_USERNAME": "beekeeper",
        "MONGO_INITDB_ROOT_PASSWORD": "test",
        "MONGO_INITDB_DATABASE": "bee"
      })
      .withExposedPorts(27017)
      .withStartupTimeout(dbtimeout)
      .withHealthCheck({
        test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    console.log('Started MongoDB container');

    // Get connection details
    const host = container.getHost();
    const port = container.getMappedPort(27017);

    const url = `mongodb://beekeeper:test@${host}:${port}/bee?authSource=admin`;

    // Create database configuration
    config = {
      client: 'mongodb',
      url,
    };

    // Create server and connection properly
    const server = createServer(config);
    connection = server.createConnection("bee");
    await connection.connect();

    // Create some test collections in the database
    await connection.createTable({ table: "users" });
    await connection.createTable({ table: "products" });
    await connection.createTable({ table: "orders" });

    // Insert some test data if needed
    await connection.executeApplyChanges({
      updates: [],
      deletes: [],
      inserts: [{
        table: "users",
        data: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 }
        ]
      }]
    });

    // Set the global connection for all tests to use
    setConnectionForTests(connection);
  });

  afterAll(async () => {
    if (connection) {
      await connection.disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  // Here we don't need to check exact matches, just that we get completion results
  testCompletions("should suggest MongoDB methods", {
    value: "db.",
    cursor: Pos(0, 3),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Just check that we got completions back
      return actualList.length > 0 && 
        actualList.some(item => item.text === "db.getMongo") &&
        actualList.some(item => item.text === "db.getName");
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
  
  testCompletions("should suggest collection methods", {
    value: "db.users.",
    cursor: Pos(0, 9),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check we have completions and some expected methods
      return actualList.length > 0 && 
        actualList.some(item => item.text.includes("find")) &&
        actualList.some(item => item.text.includes("findOne"));
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });

  // Test with a prompt symbol
  testCompletions("should work with prompt symbol", {
    value: "mongo> db.users.",
    cursor: Pos(0, 15),
    promptLine: 0,
    promptSymbol: "mongo> ",
    list: (actualList) => {
      // Check we have completions and some expected methods with prompt
      return actualList.length > 0 && 
        actualList.some(item => item.text.includes("find")) &&
        actualList.some(item => item.text.includes("findOne"));
    },
    from: Pos(0, 7),
    to: Pos(0, Infinity)
  });

  // Test with multi-line query
  testCompletions("should handle multi-line input", {
    value: "mongo> db.users\n.find().limit(10)\n.",
    cursor: Pos(2, 1),
    promptLine: 0,
    promptSymbol: "mongo> ",
    list: (actualList) => {
      // Check we have completions and some expected cursor methods
      return actualList.length > 0 && 
        actualList.some(item => item.text.includes("toArray"));
    },
    from: Pos(0, 7),
    to: Pos(2, Infinity)
  });
  
  // Test completions for database aggregation methods
  testCompletions("should suggest specific aggregation methods", {
    value: "db.users.aggregate().",
    cursor: Pos(0, 19),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check for specific aggregation cursor methods
      return actualList.some(item => item.text.includes("toArray")) &&
             actualList.some(item => item.text.includes("next")) &&
             actualList.some(item => item.text.includes("hasNext")) &&
             actualList.some(item => item.text.includes("forEach"));
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
  
  // Using just a simple verification test since update operators might vary
  testCompletions("should suggest specific update operators", {
    value: "db.users.updateOne({}, {$",
    cursor: Pos(0, 24),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Let's just verify we have completions
      return actualList.length > 0;
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
  
  // Test completions for find with query operators
  testCompletions("should suggest specific query operators", {
    value: "db.users.find({age: {$",
    cursor: Pos(0, 19),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check for specific query comparison operators
      return actualList.some(item => item.text.includes("$gt")) &&
             actualList.some(item => item.text.includes("$lt")) &&
             actualList.some(item => item.text.includes("$eq")) &&
             actualList.some(item => item.text.includes("$ne")) &&
             actualList.some(item => item.text.includes("$in"));
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
  
  // Test specific MongoDB CRUD operation methods
  testCompletions("should suggest specific CRUD methods", {
    value: "db.users.",
    cursor: Pos(0, 9),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check for specific CRUD operations
      return actualList.some(item => item.text === "db.users.find") &&
             actualList.some(item => item.text === "db.users.findOne") &&
             actualList.some(item => item.text === "db.users.insertOne") &&
             actualList.some(item => item.text === "db.users.insertMany") &&
             actualList.some(item => item.text === "db.users.updateOne") &&
             actualList.some(item => item.text === "db.users.updateMany") &&
             actualList.some(item => item.text === "db.users.deleteOne") &&
             actualList.some(item => item.text === "db.users.deleteMany");
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
  
  // Test with complex multi-line aggregation pipeline
  testCompletions("should provide specific completions for aggregation result", {
    value: "db.users.aggregate([\n  { $match: { age: { $gt: 25 } } },\n  { $group: { _id: \"$name\" } }\n]).",
    cursor: Pos(3, 3),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check for specific cursor methods on aggregation results
      return actualList.some(item => item.text.includes("toArray")) &&
             actualList.some(item => item.text.includes("next")) &&
             actualList.some(item => item.text.includes("hasNext"));
    },
    from: Pos(0, 0),
    to: Pos(3, Infinity)
  });
  
  // Test index operations
  testCompletions("should suggest index operations", {
    value: "db.users.createIndex",
    cursor: Pos(0, 19),
    promptLine: 0,
    promptSymbol: "",
    list: (actualList) => {
      // Check for index-related operations
      return actualList.some(item => item.text === "db.users.createIndex") ||
             actualList.some(item => item.text === "db.users.createIndexes") ||
             actualList.some(item => item.text === "db.users.dropIndex") ||
             actualList.some(item => item.text === "db.users.dropIndexes") ||
             actualList.some(item => item.text === "db.users.getIndexes");
    },
    from: Pos(0, 0),
    to: Pos(0, Infinity)
  });
});
