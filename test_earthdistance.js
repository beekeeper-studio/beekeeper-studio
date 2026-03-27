// Quick test script to check earthdistance operator formatting
const { deparameterizeQuery } = require('./apps/studio/src/lib/db/sql_tools');

const originalQuery = "SELECT point(0, 0)<@>point(0,0);";
console.log("Original query:", originalQuery);

try {
  const formatted = deparameterizeQuery(originalQuery, "postgresql", [], {});
  console.log("Formatted query:", formatted);
  
  // Check if the operator is preserved
  if (formatted.includes("<@>")) {
    console.log("✅ Earthdistance operator <@> is preserved in formatted query");
  } else {
    console.log("❌ Earthdistance operator <@> was removed or corrupted during formatting");
  }
  
  // Compare original and formatted
  console.log("\nComparison:");
  console.log("Original length:", originalQuery.length);
  console.log("Formatted length:", formatted.length);
  
} catch (error) {
  console.error("❌ Error during formatting:", error.message);
}