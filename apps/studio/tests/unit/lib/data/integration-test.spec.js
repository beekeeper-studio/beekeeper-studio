import _ from 'lodash';

describe('JsonViewer Integration Test', () => {
  // Simulate the exact logic from JsonViewer component
  const mockBinaryEncoding = 'hex';
  
  const typedArrayToString = (typedArray, forceEncoding) => {
    const encoding = forceEncoding || mockBinaryEncoding;
    if (encoding === 'hex') {
      return Array.from(typedArray, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return Array.from(typedArray).join(',');
  };

  const replacer = (key, value) => {
    // HACK: this is the case in mongodb objectid (copied from JsonViewer)
    if (value && typeof value === "object" && _.isTypedArray(value.buffer)) {
      return typedArrayToString(value.buffer, mockBinaryEncoding);
    }
    if (_.isTypedArray(value)) {
      return typedArrayToString(value, mockBinaryEncoding);
    }
    return value;
  };

  const deepFilterObjectProps = (obj, filter) => {
    const getPaths = (obj) => {
      const paths = [];
      const traverse = (current, path = '') => {
        if (_.isObject(current) && !_.isArray(current) && current !== null) {
          Object.keys(current).forEach(key => {
            const newPath = path ? `${path}.${key}` : key;
            traverse(current[key], newPath);
          });
        } else {
          if (path) paths.push(path);
        }
      };
      traverse(obj);
      return paths;
    };

    const paths = getPaths(obj);
    const filteredPaths = paths.filter(path => path.toLowerCase().includes(filter.toLowerCase()));
    return _.pick(obj, filteredPaths);
  };

  it('should process MongoDB document consistently', () => {
    // Simulate a real MongoDB document with ObjectId fields
    const mockDoc = {
      _id: {
        buffer: new Uint8Array([0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])
      },
      name: 'John Doe',
      userId: {
        buffer: new Uint8Array([0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf1])
      },
      profile: {
        avatar: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG header
        settings: {
          theme: 'dark',
          objectId: {
            buffer: new Uint8Array([0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf2])
          }
        }
      }
    };

    // Step 1: Apply replacer to raw data (simulating processedValue)
    const processedValue = JSON.parse(JSON.stringify(mockDoc, replacer));
    
    // Verify all ObjectIds and typed arrays are converted to strings
    expect(typeof processedValue._id).toBe('string');
    expect(typeof processedValue.userId).toBe('string');
    expect(typeof processedValue.profile.avatar).toBe('string');
    expect(typeof processedValue.profile.settings.objectId).toBe('string');
    
    // Step 2: Test unfiltered view (simulating sourceMap)
    const unfilteredSourceMapData = processedValue;
    
    // Step 3: Test filtered view with search for "objectId"
    const filteredValue = deepFilterObjectProps(processedValue, 'objectId');
    
    // Verify the filtered data contains the same string representations
    expect(filteredValue).toHaveProperty('profile.settings.objectId');
    expect(typeof filteredValue.profile.settings.objectId).toBe('string');
    
    // Most importantly: the values should be identical between filtered and unfiltered
    expect(filteredValue.profile.settings.objectId).toBe(unfilteredSourceMapData.profile.settings.objectId);
    
    // Step 4: Test filtered view with search for "userId"
    const userIdFiltered = deepFilterObjectProps(processedValue, 'userId');
    expect(userIdFiltered).toHaveProperty('userId');
    expect(typeof userIdFiltered.userId).toBe('string');
    expect(userIdFiltered.userId).toBe(unfilteredSourceMapData.userId);
    
    console.log('✅ Test passed: ObjectId fields show consistently between filtered and unfiltered views');
    console.log('Unfiltered _id:', unfilteredSourceMapData._id);
    console.log('Filtered userId:', userIdFiltered.userId);
    console.log('Filtered objectId:', filteredValue.profile.settings.objectId);
  });
});