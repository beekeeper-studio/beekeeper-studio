import { stringifyRangeData } from "../../../src/common/utils";

describe("stringifyRangeData", () => {
  it("Should convert array and objects to string", () => {
    const inputArray = [
      {
        c0: [
          {
            Plan: {
              "Node Type": "Result",
              "Async Capable": false,
              Output: ["1"],
              "Temp Written Blocks": 0,
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            "Planning Time": 0.037,
            Triggers: [],
          },
        ],
        c1: [
          {
            Plan: {
              "Node Type": "Result",
              "Parallel Aware": false,
              Output: ["1"],
              "Shared Hit Blocks": 0,
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            Triggers: [],
            "Execution Time": 0.03,
          },
        ],
        c2: [
          {
            Plan: {
              "Node Type": "Result",
              "Parallel Aware": false,

              "Actual Startup Time": 0.004,
              "Actual Rows": 1,
              Output: ["1"],
              "Shared Hit Blocks": 0,
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            "Planning Time": 0.037,
            Triggers: [],
          },
        ],
      },
      {
        c0: [
          {
            Plan: {
              "Node Type": "Result",
              "Async Capable": false,
              "Total Cost": 0.01,
              "Plan Rows": 1,
              "Plan Width": 4,
              "Actual Startup Time": 0.004,
              Output: ["1"],
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            Triggers: [],
            "Execution Time": 0.03,
          },
        ],
        c1: [
          {
            Plan: {
              "Node Type": "Result",
              "Async Capable": false,
              "Total Cost": 0.01,
              "Actual Startup Time": 0.004,
              "Actual Total Time": 0.006,
              Output: ["1"],
              "Shared Hit Blocks": 0,
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            "Planning Time": 0.037,
            Triggers: [],
          },
        ],
        c2: [
          {
            Plan: {
              "Node Type": "Result",
              "Parallel Aware": false,
              "Async Capable": false,
              "Startup Cost": 0,
              "Total Cost": 0.01,
              "Plan Rows": 1,
              "Plan Width": 4,
              "Actual Startup Time": 0.004,
              "Actual Total Time": 0.006,
              "Actual Rows": 1,
              "Actual Loops": 1,
              Output: ["1"],
              "Shared Hit Blocks": 0,
            },
            Planning: {
              "Shared Hit Blocks": 0,
            },
            "Planning Time": 0.037,
            Triggers: [],
          },
        ],
        c3: 0,
        c4: null,
        c5: undefined,
      },
    ];

    const expectedResultArray = [
      {
        c0: '[{"Plan":{"Node Type":"Result","Async Capable":false,"Output":["1"],"Temp Written Blocks":0},"Planning":{"Shared Hit Blocks":0},"Planning Time":0.037,"Triggers":[]}]',
        c1: '[{"Plan":{"Node Type":"Result","Parallel Aware":false,"Output":["1"],"Shared Hit Blocks":0},"Planning":{"Shared Hit Blocks":0},"Triggers":[],"Execution Time":0.03}]',
        c2: '[{"Plan":{"Node Type":"Result","Parallel Aware":false,"Actual Startup Time":0.004,"Actual Rows":1,"Output":["1"],"Shared Hit Blocks":0},"Planning":{"Shared Hit Blocks":0},"Planning Time":0.037,"Triggers":[]}]',
      },
      {
        c0: '[{"Plan":{"Node Type":"Result","Async Capable":false,"Total Cost":0.01,"Plan Rows":1,"Plan Width":4,"Actual Startup Time":0.004,"Output":["1"]},"Planning":{"Shared Hit Blocks":0},"Triggers":[],"Execution Time":0.03}]',
        c1: '[{"Plan":{"Node Type":"Result","Async Capable":false,"Total Cost":0.01,"Actual Startup Time":0.004,"Actual Total Time":0.006,"Output":["1"],"Shared Hit Blocks":0},"Planning":{"Shared Hit Blocks":0},"Planning Time":0.037,"Triggers":[]}]',
        c2: '[{"Plan":{"Node Type":"Result","Parallel Aware":false,"Async Capable":false,"Startup Cost":0,"Total Cost":0.01,"Plan Rows":1,"Plan Width":4,"Actual Startup Time":0.004,"Actual Total Time":0.006,"Actual Rows":1,"Actual Loops":1,"Output":["1"],"Shared Hit Blocks":0},"Planning":{"Shared Hit Blocks":0},"Planning Time":0.037,"Triggers":[]}]',
        c3: 0,
        c4: null,
        c5: undefined,
      },
    ];

    const resultArray = stringifyRangeData(inputArray);

    expect(resultArray).toMatchObject(expectedResultArray);
  });
});
