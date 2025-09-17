// Mock the utils that deepFilterObjectProps depends on
jest.mock('../../../../src/common/utils', () => ({
  typedArrayToString: jest.fn((arr) => {
    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
  }),
  toRegexSafe: jest.fn((filter) => {
    try {
      // Simple regex creation for testing
      return new RegExp(filter, 'i');
    } catch (e) {
      return null;
    }
  })
}));

import { typedArrayToString } from '../../../../src/common/utils';
import { deepFilterObjectProps } from '../../../../src/lib/data/jsonViewer';

// Mock the bksConfig global
global.window = {
  bksConfig: {
    ui: {
      general: {
        binaryEncoding: 'hex'
      }
    }
  }
};

describe('JsonViewer ObjectId Fix', () => {
  const mockReplacer = (key, value) => {
    // Simulate the MongoDB ObjectId replacer logic from JsonViewer component
    if (value && typeof value === "object" && value.buffer && Array.isArray(value.buffer)) {
      return typedArrayToString(value.buffer, 'hex');
    }
    if (value && value.constructor && value.constructor.name === 'Uint8Array') {
      return typedArrayToString(value, 'hex');
    }
    return value;
  };

  it('should apply replacer consistently before filtering', () => {
    // Mock MongoDB ObjectId structure
    const mockObjectId = {
      buffer: [0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]
    };

    const testData = {
      _id: mockObjectId,
      name: 'Test Document',
      userId: mockObjectId,
      metadata: {
        objectId: mockObjectId,
        created: '2023-01-01'
      }
    };

    // Apply replacer function (simulating processedValue computation)
    const processedData = JSON.parse(JSON.stringify(testData, mockReplacer));

    // Verify that ObjectIds are converted to strings
    expect(typeof processedData._id).toBe('string');
    expect(typeof processedData.userId).toBe('string');
    expect(typeof processedData.metadata.objectId).toBe('string');

    // Now filter the already-processed data
    const filteredData = deepFilterObjectProps(processedData, 'objectId');

    // Verify that the filtered result contains the same string representations
    expect(filteredData).toHaveProperty('metadata.objectId');
    expect(typeof filteredData.metadata.objectId).toBe('string');
    
    // The filtered data should maintain the string format from the replacer
    expect(filteredData.metadata.objectId).toBe(processedData.metadata.objectId);
  });

  it('should handle typed arrays consistently', () => {
    const testTypedArray = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    
    const testData = {
      binaryData: testTypedArray,
      normalData: 'test string'
    };

    // Apply replacer function
    const processedData = JSON.parse(JSON.stringify(testData, mockReplacer));

    // Verify typed array is converted to string
    expect(typeof processedData.binaryData).toBe('string');
    expect(processedData.binaryData).toBe('48656c6c6f'); // "Hello" in hex

    // Filter the processed data
    const filteredData = deepFilterObjectProps(processedData, 'binary');

    // Verify filtering preserves the string conversion
    expect(filteredData).toHaveProperty('binaryData');
    expect(typeof filteredData.binaryData).toBe('string');
    expect(filteredData.binaryData).toBe('48656c6c6f');
  });

  it('should produce consistent results between unfiltered and filtered views', () => {
    const mockObjectId = {
      buffer: [0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34]
    };

    const testData = {
      _id: mockObjectId,
      name: 'Test Document'
    };

    // Process data as it would be in processedValue
    const processedData = JSON.parse(JSON.stringify(testData, mockReplacer));

    // Get unfiltered version
    const unfiltered = processedData;
    
    // Get filtered version (simulating what happens when filter is applied)
    const filtered = deepFilterObjectProps(processedData, '_id');

    // Both should have the same string representation for the ObjectId
    expect(typeof unfiltered._id).toBe('string');
    expect(typeof filtered._id).toBe('string');
    expect(unfiltered._id).toBe(filtered._id);
  });
});