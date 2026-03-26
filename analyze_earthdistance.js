// Analysis script for earthdistance operator formatting
// This script demonstrates what SHOULD happen when formatting the earthdistance operator

console.log("=== Earthdistance Operator Analysis ===");

// The problematic query from the issue
const originalQuery = "SELECT point(0, 0)<@>point(0,0);";

console.log("Original Query:", originalQuery);
console.log("Expected after formatting: spaces around operator while preserving functionality");

// What we expect sql-formatter to do:
// 1. Add proper spacing around the <@> operator
// 2. Maintain the operator itself 
// 3. Not break the syntax

const expectedResult = "SELECT point(0, 0) <@> point(0, 0);";
console.log("Expected Result:", expectedResult);

// Test cases to include in our test
const testCases = [
  "SELECT point(0, 0)<@>point(0,0);",
  "SELECT point(1, 1) <@> point(2, 2);",
  "SELECT earth_distance(ll_to_earth(0, 0), ll_to_earth(0, 0));",
  "SELECT point '(0,0)' <@> point '(1,1)';",
];

console.log("\nTest Cases:");
testCases.forEach((query, index) => {
  console.log(`${index + 1}. ${query}`);
});

console.log("\n=== Analysis Complete ===");
console.log("If the sql-formatter library correctly handles PostgreSQL-specific operators,");
console.log("the <@> operator should be preserved and properly spaced.");
console.log("If not, we may need to add special handling or use a newer version.");