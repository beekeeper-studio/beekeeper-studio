import {
  DynamoDBClient,
  CreateTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * Seed DynamoDB Local with two tables and a GSI:
 *
 *   Users
 *     partition key: id (S)
 *     GSI: byEmail (email)
 *   Events
 *     partition key: userId (S)
 *     sort key: ts (N)
 *
 * The schema is minimal so the test suite can exercise the full driver surface
 * without the seed data being load-bearing for any single test.
 */
export async function setupDB(endpoint: string, region = 'us-east-1') {
  const raw = new DynamoDBClient({
    region,
    endpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
  const doc = DynamoDBDocumentClient.from(raw);

  await raw.send(new CreateTableCommand({
    TableName: 'Users',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'byEmail',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  }));
  await waitUntilTableExists({ client: raw, maxWaitTime: 30 }, { TableName: 'Users' });

  await raw.send(new CreateTableCommand({
    TableName: 'Events',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'ts', AttributeType: 'N' },
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'ts', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  }));
  await waitUntilTableExists({ client: raw, maxWaitTime: 30 }, { TableName: 'Events' });

  const users = [
    { id: 'u1', email: 'alice@example.com', name: 'Alice', age: 25 },
    { id: 'u2', email: 'bob@example.com', name: 'Bob', age: 30 },
    { id: 'u3', email: 'charlie@example.com', name: 'Charlie', age: 35 },
    { id: 'u4', email: 'dawn@example.com', name: 'Dawn', age: 40 },
    { id: 'u5', email: 'eve@example.com', name: 'Eve', age: 45 },
  ];

  await doc.send(new BatchWriteCommand({
    RequestItems: {
      Users: users.map((u) => ({ PutRequest: { Item: u } })),
    },
  }));

  const events = Array.from({ length: 10 }, (_, i) => ({
    userId: `u${(i % 5) + 1}`,
    ts: 1000 + i,
    kind: i % 2 === 0 ? 'click' : 'view',
  }));
  await doc.send(new BatchWriteCommand({
    RequestItems: {
      Events: events.map((e) => ({ PutRequest: { Item: e } })),
    },
  }));

  doc.destroy();
}
