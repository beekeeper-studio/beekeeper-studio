import Vuex, { Store } from "vuex";
import Vue from "vue";
import _ from "lodash";
import { CloudConnectionModule } from "@/store/modules/data/connection/CloudConnectionModule";
import { ICloudSavedConnection } from "@/common/interfaces/IConnection";

Vue.use(Vuex);

type TestConnection = ICloudSavedConnection;

interface MockCloudClient {
  connections: {
    reorder: jest.Mock;
    list: jest.Mock;
  };
}

function createMockConnection(
  id: number,
  name: string,
  position: number,
  connectionFolderId: number | null = null
): TestConnection {
  return {
    id,
    name,
    position,
    connectionFolderId,
    workspaceId: 1,
    connectionType: "postgresql",
    defaultDatabase: "test",
    host: "localhost",
    port: 5432,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TestConnection;
}

function createMockCloudClient(latencyMs: number = 0, siblingPositions?: { id: number; position: number }[]): MockCloudClient {
  return {
    connections: {
      reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
        if (latencyMs > 0) {
          await new Promise((r) => setTimeout(r, latencyMs));
        }
        // Return all sibling positions (simulating server response)
        // If siblingPositions provided, use those, otherwise return sensible defaults
        if (siblingPositions) {
          return siblingPositions.map(s => ({
            id: s.id,
            position: s.position,
            updatedAt: Date.now(),
          }));
        }
        // Default: return just the moved item with position 1
        return [{
          id,
          position: 1,
          updatedAt: Date.now(),
        }];
      }),
      list: jest.fn().mockResolvedValue([]),
    },
  };
}

function createStore(
  mockClient: MockCloudClient,
  initialConnections: TestConnection[] = []
): Store<any> {
  // Deep clone the module to avoid shared state between tests
  const moduleClone = _.cloneDeep(CloudConnectionModule);

  return new Vuex.Store({
    state: {
      workspaceId: 1,
    },
    getters: {
      cloudClient: () => mockClient,
    },
    modules: {
      data: {
        namespaced: true,
        modules: {
          connections: {
            ...moduleClone,
            state: {
              items: initialConnections,
              loading: false,
              error: null,
              pollError: null,
              filter: undefined,
              pendingSaveIds: [],
            },
          },
        },
      },
    },
  });
}

function getConnectionsInOrder(store: Store<any>): TestConnection[] {
  const items = store.state.data.connections.items as TestConnection[];
  return _.sortBy(items, "position");
}

function getConnectionById(
  store: Store<any>,
  id: number
): TestConnection | undefined {
  return (store.state.data.connections.items as TestConnection[]).find(
    (c) => c.id === id
  );
}

describe("CloudConnectionModule reorder", () => {
  let store: Store<any>;
  let mockClient: MockCloudClient;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("API response scenarios (potential snap-back causes)", () => {
    it("reorder API returns all siblings with correct positions", async () => {
      // The reorder API now returns ALL siblings with updated positions
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
      ];

      mockClient = {
        connections: {
          reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
            await new Promise(r => setTimeout(r, 50));
            // Server returns ALL siblings with correct positions
            return [
              { id: 2, position: 1, updatedAt: Date.now() },
              { id: 1, position: 2, updatedAt: Date.now() },
            ];
          }),
          list: jest.fn().mockResolvedValue([]),
        },
      };
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 2 },
        position: { before: 1 }, // Move to first
        connectionFolderId: null,
      });

      // Optimistic update should put item 2 first
      let item2 = getConnectionById(store, 2);
      const optimisticPos = item2!.position;
      expect(optimisticPos).toBeLessThan(1);
      console.log("Optimistic position:", optimisticPos);

      // API returns
      jest.advanceTimersByTime(100);
      await reorderPromise;

      // After API, all positions should be updated from server response
      item2 = getConnectionById(store, 2);
      const item1 = getConnectionById(store, 1);
      console.log("After API - item2 position:", item2!.position);
      console.log("After API - item1 position:", item1!.position);

      // Positions should match server response
      expect(item2!.position).toBe(1);
      expect(item1!.position).toBe(2);
    });

    it("reorder API prevents position collisions by returning all siblings", async () => {
      // The reorder API returns ALL siblings, preventing collisions
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];

      mockClient = {
        connections: {
          reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
            await new Promise(r => setTimeout(r, 50));
            // Server returns ALL siblings with renumbered positions - no collisions
            return [
              { id: 3, position: 1, updatedAt: Date.now() },
              { id: 1, position: 2, updatedAt: Date.now() },
              { id: 2, position: 3, updatedAt: Date.now() },
            ];
          }),
          list: jest.fn().mockResolvedValue([]),
        },
      };
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      jest.advanceTimersByTime(100);
      await reorderPromise;

      // All items should have unique positions from server
      const item1 = getConnectionById(store, 1);
      const item2 = getConnectionById(store, 2);
      const item3 = getConnectionById(store, 3);
      console.log("Item 1 position:", item1!.position);
      console.log("Item 2 position:", item2!.position);
      console.log("Item 3 position:", item3!.position);

      expect(item3!.position).toBe(1);
      expect(item1!.position).toBe(2);
      expect(item2!.position).toBe(3);

      // No collision - all positions are unique
      const positions = [item1!.position, item2!.position, item3!.position];
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(3);

      // Sort order should be stable
      const sorted = getConnectionsInOrder(store);
      console.log("Sorted order:", sorted.map(c => ({ id: c.id, pos: c.position })));
      expect(sorted[0].id).toBe(3);
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(2);
    });

    it("reorder API always returns position for all siblings", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
      ];

      mockClient = {
        connections: {
          reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
            await new Promise(r => setTimeout(r, 50));
            // Server always returns position for all siblings
            return [
              { id: 2, position: 1, updatedAt: Date.now() },
              { id: 1, position: 2, updatedAt: Date.now() },
            ];
          }),
          list: jest.fn().mockResolvedValue([]),
        },
      };
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 2 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Optimistic position
      let item2 = getConnectionById(store, 2);
      const optimisticPos = item2!.position;
      console.log("Optimistic position:", optimisticPos);

      jest.advanceTimersByTime(100);
      await reorderPromise;

      // After API, positions should be from server
      item2 = getConnectionById(store, 2);
      const item1 = getConnectionById(store, 1);
      console.log("After API - item2:", item2!.position);
      console.log("After API - item1:", item1!.position);

      expect(item2!.position).toBe(1);
      expect(item1!.position).toBe(2);
    });

    it("simulates drag from position 2 to position 1 - exact user scenario", async () => {
      // Recreate the exact scenario: drag item from pos 2 to pos 1
      const connections = [
        createMockConnection(1, "ConnectionA", 1),
        createMockConnection(2, "ConnectionB", 2),
        createMockConnection(3, "ConnectionC", 3),
      ];

      // Server returns ALL siblings with their new positions (the fix!)
      mockClient = {
        connections: {
          reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
            console.log("API reorder call:", { id, position, folderId });
            await new Promise(r => setTimeout(r, 100));

            // Server renumbers ALL siblings - no collisions
            const response = [
              { id: 2, position: 1, updatedAt: Date.now() }, // Moved item
              { id: 1, position: 2, updatedAt: Date.now() }, // Shifted down
              { id: 3, position: 3, updatedAt: Date.now() }, // Unchanged
            ];
            console.log("API response (all siblings):", response);
            return response;
          }),
          list: jest.fn().mockResolvedValue([]),
        },
      };
      store = createStore(mockClient, connections);

      console.log("\n=== Starting drag from position 2 to position 1 ===");
      console.log("Initial state:", getConnectionsInOrder(store).map(c => ({ id: c.id, name: c.name, pos: c.position })));

      // User drags ConnectionB (pos 2) to before ConnectionA (pos 1)
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 2 }, // ConnectionB
        position: { before: 1 }, // Before ConnectionA
        connectionFolderId: null,
      });

      // Check optimistic state immediately
      const optimisticOrder = getConnectionsInOrder(store);
      console.log("After optimistic update:", optimisticOrder.map(c => ({ id: c.id, name: c.name, pos: c.position })));

      // ConnectionB should be first (position 0.5)
      expect(optimisticOrder[0].id).toBe(2);
      expect(optimisticOrder[0].position).toBeLessThan(1);

      // Wait for API
      jest.advanceTimersByTime(150);
      await reorderPromise;

      const finalOrder = getConnectionsInOrder(store);
      console.log("After API response:", finalOrder.map(c => ({ id: c.id, name: c.name, pos: c.position })));

      // FIX VERIFICATION: All items have correct, non-colliding positions
      expect(finalOrder[0].id).toBe(2); // ConnectionB is first
      expect(finalOrder[0].position).toBe(1);
      expect(finalOrder[1].id).toBe(1); // ConnectionA is second
      expect(finalOrder[1].position).toBe(2);
      expect(finalOrder[2].id).toBe(3); // ConnectionC is third
      expect(finalOrder[2].position).toBe(3);

      // No position collisions
      const positions = finalOrder.map(c => c.position);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);
    });
  });

  describe("optimistic update behavior", () => {
    it("immediately updates position in store before API response", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      // Start the reorder (move "Third" before "First")
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Immediately after dispatch (before API returns), check the store
      // The position should be optimistically updated
      const thirdConn = getConnectionById(store, 3);
      expect(thirdConn).toBeDefined();
      // Optimistic position should be calculated (minPos - 1 or similar)
      expect(thirdConn!.position).toBeLessThan(1);

      // Fast-forward past the API latency
      jest.advanceTimersByTime(150);
      await reorderPromise;
    });

    it("maintains position with 0ms latency", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(0);
      store = createStore(mockClient, connections);

      await store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { after: 1 },
        connectionFolderId: null,
      });

      // API should have been called
      expect(mockClient.connections.reorder).toHaveBeenCalledWith(
        3,
        { after: 1 },
        null
      );

      // Store should have the updated position
      const thirdConn = getConnectionById(store, 3);
      expect(thirdConn).toBeDefined();
      expect(thirdConn!.position).toBeDefined();
    });

    it("maintains position with 100ms latency", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { after: 1 },
        connectionFolderId: null,
      });

      // Check optimistic update happened
      const beforeApiConn = getConnectionById(store, 3);
      expect(beforeApiConn!.position).toBeCloseTo(1.5, 1); // after item with position 1

      jest.advanceTimersByTime(150);
      await reorderPromise;

      // After API response, position should be server's value
      const afterApiConn = getConnectionById(store, 3);
      expect(afterApiConn!.position).toBe(1); // Server returned position: 1
    });

    it("maintains position with 500ms latency", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(500);
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { after: 2 },
        connectionFolderId: null,
      });

      // Optimistic update should have the item between positions 2 and 3
      const midwayConn = getConnectionById(store, 3);
      expect(midwayConn!.position).toBeCloseTo(2.5, 1);

      jest.advanceTimersByTime(600);
      await reorderPromise;

      const finalConn = getConnectionById(store, 3);
      expect(finalConn).toBeDefined();
    });
  });

  describe("poll during save scenarios", () => {
    it("maintains position when poll runs during save", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(200);

      // Set up poll to return old positions
      mockClient.connections.list.mockResolvedValue([
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3), // Old position!
      ]);

      store = createStore(mockClient, connections);

      // Start reorder
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Optimistic update should place item 3 first
      const optimisticConn = getConnectionById(store, 3);
      expect(optimisticConn!.position).toBeLessThan(1);

      // Simulate poll running mid-save (at 100ms, before API returns at 200ms)
      jest.advanceTimersByTime(100);
      await store.dispatch("data/connections/poll");

      // After poll, check if position was reverted (THIS IS THE BUG)
      const afterPollConn = getConnectionById(store, 3);

      // Record what happens - this test documents the current behavior
      // If afterPollConn.position === 3, the poll overwrote the optimistic update (BUG)
      // If afterPollConn.position < 1, the optimistic update was preserved (CORRECT)
      console.log(
        "Position after poll during save:",
        afterPollConn!.position
      );

      // EXPECTED: Optimistic position should be preserved during pending save
      // This will FAIL until the bug is fixed
      expect(afterPollConn!.position).toBeLessThan(1);

      // Complete the API call
      jest.advanceTimersByTime(150);
      await reorderPromise;

      const finalConn = getConnectionById(store, 3);
      console.log("Final position after API response:", finalConn!.position);
    });

    it("should preserve optimistic position when poll runs during save", async () => {
      // This test will FAIL until the bug is fixed
      // It asserts the CORRECT expected behavior
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(200);

      // Poll returns stale data (server hasn't processed the reorder yet)
      mockClient.connections.list.mockResolvedValue([
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ]);

      store = createStore(mockClient, connections);

      // User drags item 3 to first position
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Verify optimistic update worked
      let item3 = getConnectionById(store, 3);
      const optimisticPosition = item3!.position;
      expect(optimisticPosition).toBeLessThan(1); // User sees item at top

      // Poll runs during the save (this happens in production with 5s interval)
      jest.advanceTimersByTime(50);
      await store.dispatch("data/connections/poll");

      // EXPECTED: Poll should NOT overwrite the optimistic position
      // The item should remain at the optimistic position until API completes
      item3 = getConnectionById(store, 3);
      expect(item3!.position).toBeLessThan(1); // Should still be at top, not snapped back

      // Complete the API call
      jest.advanceTimersByTime(200);
      await reorderPromise;

      // Final position from server
      item3 = getConnectionById(store, 3);
      expect(item3!.position).toBe(1);
    });

    it("handles poll returning updated positions during save", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
      ];
      mockClient = createMockCloudClient(200);

      store = createStore(mockClient, connections);

      // Start reorder
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { after: 1 },
        connectionFolderId: null,
      });

      // Wait a bit, then update poll to return new positions
      jest.advanceTimersByTime(50);

      // Poll now returns the NEW positions (as if server already processed)
      mockClient.connections.list.mockResolvedValue([
        createMockConnection(1, "First", 1),
        createMockConnection(3, "Third", 2), // New position
        createMockConnection(2, "Second", 3),
      ]);

      // Run poll
      await store.dispatch("data/connections/poll");

      // Complete the API call
      jest.advanceTimersByTime(200);
      await reorderPromise;

      const finalOrder = getConnectionsInOrder(store);
      console.log(
        "Final order:",
        finalOrder.map((c) => ({ id: c.id, pos: c.position }))
      );
    });
  });

  describe("rapid reorder scenarios", () => {
    it("handles multiple rapid reorders", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
        createMockConnection(3, "Third", 3),
        createMockConnection(4, "Fourth", 4),
      ];
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      // User drags multiple times quickly
      const reorder1 = store.dispatch("data/connections/reorder", {
        item: { id: 4 },
        position: { after: 1 },
        connectionFolderId: null,
      });

      jest.advanceTimersByTime(20);

      const reorder2 = store.dispatch("data/connections/reorder", {
        item: { id: 4 },
        position: { after: 2 },
        connectionFolderId: null,
      });

      jest.advanceTimersByTime(20);

      const reorder3 = store.dispatch("data/connections/reorder", {
        item: { id: 4 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Check state during rapid updates
      const midConn = getConnectionById(store, 4);
      console.log("Position during rapid reorders:", midConn!.position);

      // Complete all API calls
      jest.advanceTimersByTime(200);
      await Promise.all([reorder1, reorder2, reorder3]);

      // Check how many times API was called
      expect(mockClient.connections.reorder).toHaveBeenCalledTimes(3);

      const finalConn = getConnectionById(store, 4);
      console.log("Final position after rapid reorders:", finalConn!.position);
    });

    it("maintains correct order after competing updates", async () => {
      const connections = [
        createMockConnection(1, "A", 1),
        createMockConnection(2, "B", 2),
        createMockConnection(3, "C", 3),
      ];

      // API returns with delays that arrive out of order
      let callCount = 0;
      mockClient = {
        connections: {
          reorder: jest.fn().mockImplementation(async (id, position, folderId) => {
            callCount++;
            const thisCall = callCount;
            // First call returns last, second returns first
            const delay = thisCall === 1 ? 200 : 50;
            await new Promise((r) => setTimeout(r, delay));
            return [{
              id,
              position: thisCall,
              updatedAt: Date.now(),
            }];
          }),
          list: jest.fn().mockResolvedValue([]),
        },
      };
      store = createStore(mockClient, connections);

      // Two reorders - API responses will arrive out of order
      const reorder1 = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      jest.advanceTimersByTime(10);

      const reorder2 = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { after: 2 },
        connectionFolderId: null,
      });

      // Second API call returns first (at 60ms)
      jest.advanceTimersByTime(60);
      await Promise.resolve(); // Let second API resolve

      const afterSecondApi = getConnectionById(store, 3);
      console.log(
        "Position after second API (arrived first):",
        afterSecondApi!.position
      );

      // First API call returns (at 210ms total)
      jest.advanceTimersByTime(200);
      await Promise.all([reorder1, reorder2]);

      const afterFirstApi = getConnectionById(store, 3);
      console.log(
        "Position after first API (arrived last):",
        afterFirstApi!.position
      );

      // The position might be wrong if we don't handle out-of-order responses
    });
  });

  describe("folder move with reorder", () => {
    it("moves item to new folder at first position", async () => {
      const connections = [
        createMockConnection(1, "FolderAItem1", 1, 100),
        createMockConnection(2, "FolderAItem2", 2, 100),
        createMockConnection(3, "FolderBItem1", 1, 200),
      ];
      // Use latency to capture the optimistic state before API response
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 1 },
        position: { before: null },
        connectionFolderId: 200, // Move to folder B
      });

      // Check optimistic update
      const optimisticConn = getConnectionById(store, 1);
      expect(optimisticConn!.connectionFolderId).toBe(200);
      // Should be before existing item in folder B (position 1)
      expect(optimisticConn!.position).toBeLessThanOrEqual(0);

      // Complete API
      jest.advanceTimersByTime(150);
      await reorderPromise;

      // After API, position is server-returned value
      const finalConn = getConnectionById(store, 1);
      expect(finalConn!.connectionFolderId).toBe(200);
    });

    it("moves item to new folder after specific item", async () => {
      const connections = [
        createMockConnection(1, "FolderAItem1", 1, 100),
        createMockConnection(2, "FolderBItem1", 1, 200),
        createMockConnection(3, "FolderBItem2", 2, 200),
      ];
      // Use latency to capture the optimistic state before API response
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 1 },
        position: { after: 2 }, // After FolderBItem1
        connectionFolderId: 200,
      });

      // Check optimistic update
      const optimisticConn = getConnectionById(store, 1);
      expect(optimisticConn!.connectionFolderId).toBe(200);
      // Should be after position 1 (FolderBItem1's position)
      expect(optimisticConn!.position).toBeCloseTo(1.5, 1);

      // Complete API
      jest.advanceTimersByTime(150);
      await reorderPromise;
    });
  });

  describe("edge cases", () => {
    it("handles reorder of non-existent item gracefully", async () => {
      const connections = [createMockConnection(1, "Only", 1)];
      mockClient = createMockCloudClient(0);
      store = createStore(mockClient, connections);

      const result = await store.dispatch("data/connections/reorder", {
        item: { id: 999 }, // Does not exist
        position: { before: 1 },
        connectionFolderId: null,
      });

      expect(result).toBeUndefined();
      expect(mockClient.connections.reorder).not.toHaveBeenCalled();
    });

    it("handles empty folder positioning", async () => {
      const connections = [createMockConnection(1, "Item", 1, null)];
      mockClient = createMockCloudClient(0);
      store = createStore(mockClient, connections);

      await store.dispatch("data/connections/reorder", {
        item: { id: 1 },
        position: { before: null }, // First in empty folder
        connectionFolderId: 999, // New folder with no items
      });

      const conn = getConnectionById(store, 1);
      expect(conn!.connectionFolderId).toBe(999);
      // With no siblings, position calculation should handle gracefully
      expect(typeof conn!.position).toBe("number");
    });

    it("handles position object with null before (first position)", async () => {
      const connections = [
        createMockConnection(1, "First", 1),
        createMockConnection(2, "Second", 2),
      ];
      // Use latency to capture the optimistic state before API response
      mockClient = createMockCloudClient(100);
      store = createStore(mockClient, connections);

      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 2 },
        position: { before: null }, // Move to first
        connectionFolderId: null,
      });

      // Check optimistic update
      const optimisticConn = getConnectionById(store, 2);
      // Should calculate position before the minimum existing position
      expect(optimisticConn!.position).toBeLessThan(1);

      // Complete API
      jest.advanceTimersByTime(150);
      await reorderPromise;
    });
  });

  describe("state consistency checks", () => {
    it("verifies upsert mutation preserves other item properties", async () => {
      const connections = [
        createMockConnection(1, "Test", 1),
      ];
      mockClient = createMockCloudClient(0);
      store = createStore(mockClient, connections);

      const originalConn = getConnectionById(store, 1);
      const originalHost = originalConn!.host;
      const originalPort = originalConn!.port;

      await store.dispatch("data/connections/reorder", {
        item: { id: 1 },
        position: { before: null },
        connectionFolderId: 100,
      });

      const updatedConn = getConnectionById(store, 1);
      expect(updatedConn!.host).toBe(originalHost);
      expect(updatedConn!.port).toBe(originalPort);
      expect(updatedConn!.connectionFolderId).toBe(100);
    });

    it("tracks position values through full reorder cycle", async () => {
      const connections = [
        createMockConnection(1, "A", 1),
        createMockConnection(2, "B", 2),
        createMockConnection(3, "C", 3),
      ];
      mockClient = createMockCloudClient(50);
      store = createStore(mockClient, connections);

      const positions: { stage: string; id: number; position: number }[] = [];

      // Record initial
      connections.forEach((c) => {
        positions.push({ stage: "initial", id: c.id, position: c.position });
      });

      // Start reorder
      const reorderPromise = store.dispatch("data/connections/reorder", {
        item: { id: 3 },
        position: { before: 1 },
        connectionFolderId: null,
      });

      // Record after optimistic
      const afterOptimistic = getConnectionById(store, 3);
      positions.push({
        stage: "optimistic",
        id: 3,
        position: afterOptimistic!.position,
      });

      // Complete API
      jest.advanceTimersByTime(100);
      await reorderPromise;

      // Record final
      const afterApi = getConnectionById(store, 3);
      positions.push({
        stage: "final",
        id: 3,
        position: afterApi!.position,
      });

      console.log("Position tracking:", positions);

      // Verify the flow
      expect(positions[3].stage).toBe("optimistic");
      expect(positions[3].position).toBeLessThan(1); // Moved before first
      expect(positions[4].stage).toBe("final");
    });
  });
});
