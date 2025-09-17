import { shallowMount, createLocalVue } from '@vue/test-utils';
import JsonViewer from '../../../../src/components/sidebar/JsonViewer.vue';
import Vuex from 'vuex';

const localVue = createLocalVue();
localVue.use(Vuex);

// Mock the text editor component since it's complex to test
const MockTextEditor = {
  name: 'TextEditor',
  template: '<div class="mock-text-editor">{{ value }}</div>',
  props: ['value', 'fold-all', 'unfold-all', 'force-initialize', 'markers', 'replace-extensions', 'line-wrapping', 'line-gutters', 'line-numbers', 'fold-gutters', 'language-id']
};

// Mock the upsell component
const MockJsonViewerUpsell = {
  name: 'JsonViewerUpsell',
  template: '<div class="mock-upsell"></div>'
};

// Mock Vuex store with required getters
const store = new Vuex.Store({
  getters: {
    expandFKDetailsByDefault: () => false,
    isCommunity: () => true
  }
});

describe('JsonViewer', () => {
  it('should handle MongoDB ObjectId consistently between filtered and unfiltered views', () => {
    // Mock MongoDB ObjectId data structure (as it would come from the database)
    const mockObjectId = {
      buffer: new Uint8Array([0x64, 0x8a, 0x9c, 0x2e, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])
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

    const wrapper = shallowMount(JsonViewer, {
      localVue,
      store,
      components: {
        'text-editor': MockTextEditor,
        'json-viewer-upsell': MockJsonViewerUpsell
      },
      propsData: {
        value: testData,
        binaryEncoding: 'hex'
      }
    });

    // Test that processedValue has replacer applied
    const processedValue = wrapper.vm.processedValue;
    
    // The ObjectId should be converted to a string representation
    expect(typeof processedValue._id).toBe('string');
    expect(typeof processedValue.userId).toBe('string');
    expect(typeof processedValue.metadata.objectId).toBe('string');
    
    // Test that when filter is applied, the same transformations are preserved
    wrapper.setProps({ filter: 'objectId' });
    
    const filteredValue = wrapper.vm.filteredValue;
    
    // Only the filtered paths should remain, but they should still be string representations
    expect(filteredValue).toHaveProperty('metadata.objectId');
    expect(typeof filteredValue.metadata.objectId).toBe('string');
    
    // Test that the source map is generated consistently
    const sourceMap = wrapper.vm.sourceMap;
    expect(sourceMap.json).toBeDefined();
    expect(sourceMap.pointers).toBeDefined();
    
    // Verify that the JSON output contains string representations, not ObjectId objects
    expect(sourceMap.json).not.toContain('[object Object]');
    expect(sourceMap.json).not.toContain('buffer');
  });

  it('should apply replacer function to processedValue before filtering', () => {
    const testTypedArray = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" in bytes
    
    const testData = {
      binaryData: testTypedArray,
      normalData: 'test string'
    };

    const wrapper = shallowMount(JsonViewer, {
      localVue,
      store,
      components: {
        'text-editor': MockTextEditor,
        'json-viewer-upsell': MockJsonViewerUpsell
      },
      propsData: {
        value: testData,
        binaryEncoding: 'hex'
      }
    });

    // Check that the typed array is converted to a string in processedValue
    const processedValue = wrapper.vm.processedValue;
    expect(typeof processedValue.binaryData).toBe('string');
    expect(processedValue.binaryData).toMatch(/^[0-9a-f]+$/i); // hex string pattern
    
    // Normal data should remain unchanged
    expect(processedValue.normalData).toBe('test string');
    
    // Test that filtering works on the already-processed data
    wrapper.setProps({ filter: 'binary' });
    const filteredValue = wrapper.vm.filteredValue;
    
    expect(filteredValue).toHaveProperty('binaryData');
    expect(typeof filteredValue.binaryData).toBe('string');
    expect(filteredValue.binaryData).toMatch(/^[0-9a-f]+$/i);
  });
});