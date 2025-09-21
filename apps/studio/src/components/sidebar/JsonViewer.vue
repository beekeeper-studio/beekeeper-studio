<template>
  <div
    class="json-viewer"
    ref="sidebar"
    v-show="!hidden"
  >
    <!-- Header with menu moved to sidebar header -->
    <div class="header" style="display: none;">
      <div
        class="header-group"
        v-show="!empty"
      >
        <!-- Menu moved to secondary sidebar header -->
      </div>
    </div>
    <div class="custom-search-panel">
      <div class="search-row">
        <div class="search-input-container">
          <input
            ref="searchInput"
            class="search-input"
            type="text"
            placeholder="Search"
            v-model="searchQuery"
            @input="debouncedPerformSearch"
            @keydown.enter="findNextFromInput"
            @keydown.shift.enter="findPreviousFromInput"
            @focus="searchInputFocused = true"
            @blur="searchInputFocused = false"
          />
          <div class="search-controls">
            <button
              class="search-control-btn"
              :class="{ active: matchCase }"
              @click="toggleMatchCase"
              title="Match Case"
            >
              <i class="material-icons">text_fields</i>
            </button>
            <button
              class="search-control-btn"
              :class="{ active: wholeWord }"
              @click="toggleWholeWord"
              title="Match Whole Word"
            >
              <i class="material-icons">select_all</i>
            </button>
            <button
              class="search-control-btn"
              :class="{ active: useRegex }"
              @click="toggleRegex"
              title="Use Regular Expression"
            >
              <i class="material-icons">code</i>
            </button>
          </div>
        </div>
        <div class="search-navigation">
          <span class="search-results" v-if="searchQuery">{{ currentMatch }} of {{ totalMatches }}</span>
          <button class="nav-btn" @click="findPrevious" title="Previous Match">
            <i class="material-icons">keyboard_arrow_up</i>
          </button>
          <button class="nav-btn" @click="findNext" title="Next Match">
            <i class="material-icons">keyboard_arrow_down</i>
          </button>
          <button
            class="toggle-replace-btn"
            :class="{ active: showReplace }"
            @click="toggleReplace"
            title="Toggle Replace"
          >
            <i class="material-icons">find_replace</i>
          </button>
        </div>
      </div>
      <div class="replace-row" v-if="showReplace">
        <div class="replace-input-container">
          <input
            ref="replaceInput"
            class="replace-input"
            type="text"
            placeholder="Replace"
            v-model="replaceQuery"
            @keydown.enter="replaceNext"
          />
        </div>
        <div class="replace-actions">
          <button class="replace-btn" @click="replaceNext" title="Replace">
            <i class="material-icons">swap_horiz</i>
          </button>
          <button class="replace-btn" @click="replaceAll" title="Replace All">
            <i class="material-icons">swap_horizontal_circle</i>
          </button>
        </div>
      </div>
    </div>
    <div class="text-editor-wrapper">
      <text-editor
        ref="textEditor"
        language-id="json"
        :fold-all="foldAll"
        :unfold-all="unfoldAll"
        :value="text"
        :force-initialize="reinitializeTextEditor + (reinitialize ?? 0)"
        :markers="markers"
        :replaceExtensions="replaceExtensions"
        :line-wrapping="wrapText"
        :line-gutters="lineGutters"
        :line-numbers="false"
        :fold-gutters="true"
      />
    </div>
    <div class="empty-state" v-show="empty">
      Open a table to view its data
    </div>
    <json-viewer-upsell v-if="$store.getters.isCommunity" />
  </div>
</template>

<script lang="ts">
/**
 * hidden:  it's recommended to use `hidden` prop instead of v-show so that
 *          the text editor can be reinitialized.
 * dataId:  use this to update the component with new data.
 */
import Vue from "vue";
import TextEditor from "@beekeeperstudio/ui-kit/vue/text-editor"
import {
  ExpandablePath,
  findKeyPosition,
  findValueInfo,
  createExpandableTextDecoration,
  createTruncatableTextDecoration,
  deepFilterObjectProps,
  getPaths,
  eachPaths,
} from "@/lib/data/jsonViewer";
import { mapGetters } from "vuex";
import { EditorMarker, LineGutter } from "@beekeeperstudio/ui-kit";
import { persistJsonFold } from "@/lib/editor/extensions/persistJsonFold";
import { partialReadonly } from "@/lib/editor/extensions/partialReadOnly";
import JsonViewerUpsell from '@/components/upsell/JsonViewerSidebarUpsell.vue'
import rawLog from "@bksLogger";
import _ from "lodash";
import globals from '@/common/globals'
import JsonSourceMap from "json-source-map";
import JsonPointer from "json-pointer";
import { typedArrayToString } from '@/common/utils'
import { monokai } from "@uiw/codemirror-theme-monokai";
import { EditorView, keymap } from "@codemirror/view";

const log = rawLog.scope("json-viewer");

export default Vue.extend({
  components: { TextEditor, JsonViewerUpsell },
  props: {
    value: {
      type: [Object, Array],
      default: () => ({})
    },
    hidden: {
      type: Boolean,
      default: false
    },
    expandablePaths: {
      type: Array,
      default: () => []
    },
    editablePaths: {
      type: Array,
      default: () => []
    },
    dataId: [String, Number],
    title: String,
    reinitialize: null,
    signs: {
      type: Object,
      default: () => ({})
    },
    binaryEncoding: String,
    filter: {
      type: String,
      default: ""
    },
  },
  data() {
    return {
      reinitializeTextEditor: 0,
      foldAll: 0,
      unfoldAll: 0,
      restoredTruncatedPaths: [],
      editableRangeErrors: [],
      wrapText: false,
      persistJsonFold: persistJsonFold(),
      partialReadonly: partialReadonly(),
      // Custom search state
      searchQuery: '',
      replaceQuery: '',
      matchCase: false,
      wholeWord: false,
      useRegex: false,
      showReplace: false,
      currentMatch: 0,
      totalMatches: 0,
      searchMatches: [],
      currentSearchState: null,
      searchInputFocused: false,
    };
  },
  watch: {
    hidden() {
      if (!this.hidden) this.reinitializeTextEditor++;
    },
    dataId() {
      if (this.expandFKDetailsByDefault) {
        this.expandablePaths.forEach((expandablePath: ExpandablePath) => {
          // Expand only the first level
          if (expandablePath.path.length === 1) {
            this.expandPath(expandablePath);
          }
        });
      }
    },
    async text() {
      this.persistJsonFold.save()
      await this.$nextTick()
      setTimeout(() => this.persistJsonFold.apply())
      
      // Only re-run search if text actually changed and we have a search query
      // Don't run search during initial load or editor re-initialization
      if (this.searchQuery && this.searchMatches.length > 0) {
        setTimeout(() => {
          this.performSearch();
        }, 100);
      }
    },
    editableRanges() {
      this.partialReadonly.setEditableRanges(this.editableRanges)
    },
  },
  computed: {
    sidebarTitle() {
      return this.title ?? "JSON Row Viewer"
    },
    empty() {
      return _.isEmpty(this.value);
    },
    text() {
      if (this.empty) {
        return ""
      }
      return this.sourceMap.json
    },
    debouncedFilter: {
      get() {
        return this.filter;
      },
      set: _.debounce(function (value) {
        this.setFilter(value);
      }, 500),
    },
    sourceMap() {
      let replacedFilteredValue = this.filteredValue;
      try {
        // run the replacer on the filteredValue
        replacedFilteredValue = JSON.parse(JSON.stringify(this.filteredValue, this.replacer));
      } catch (error) {
        log.warn("Failed to replace filtered value", error);
      }
      return JsonSourceMap.stringify(replacedFilteredValue, null, 2);
    },
    filteredValue() {
      if (this.empty) {
        return {}
      }
      if (!this.filter) {
        return this.processedValue
      }
      return deepFilterObjectProps(this.processedValue, this.filter);
    },
    processedValue() {
      const clonedValue = _.cloneDeep(this.value)
      eachPaths(clonedValue, (path, value) => {
        if (this.truncatedPaths.includes(path)) {
          _.set(clonedValue, path, (value as string).slice(0, globals.maxDetailViewTextLength))
        }
      })
      return clonedValue
    },
    truncatablePaths() {
      return getPaths(this.value).filter((path) => {
        const val = _.get(this.value, path)
        if (
          typeof val === "string" &&
          val.length > globals.maxDetailViewTextLength
        ) {
          return true
        }
        return false
      })
    },
    truncatedPaths() {
      return _.difference(this.truncatablePaths, this.restoredTruncatedPaths)
    },
    markers() {
      const markers: EditorMarker[] = [];
      _.forEach(this.expandablePaths, (expandablePath: ExpandablePath) => {
        try {
          const line = findKeyPosition(this.text, expandablePath.path);
          const { from, to, value } = findValueInfo(this.lines[line]);
          const onClick = () => {
            this.expandPath(expandablePath);
          };
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            decoration: createExpandableTextDecoration(value, onClick),
          });
        } catch (e) {
          log.warn("Failed to mark expandable path", expandablePath);
          log.warn(e);
        }
      });
      _.forEach(this.truncatedPaths, (path) => {
        // Avoid conflicts with expandable paths
        if (this.expandablePaths.includes(path)) {
          return
        }
        try {
          const line = findKeyPosition(this.text, path.split("."));
          const { from, to, value } = findValueInfo(this.lines[line]);
          const onClick = async () => {
            this.restoredTruncatedPaths.push(path)
          }
          markers.push({
            type: "custom",
            from: { line, ch: from },
            to: { line, ch: to },
            decoration: createTruncatableTextDecoration(value, onClick),
          });
        } catch (e) {
          log.warn("Failed to mark truncated path", path);
          log.warn(e);
        }
      })
      _.forEach(this.editableRangeErrors, ({ error, from, to }) => {
        markers.push({
          type: "error",
          from,
          to,
          message: error.message,
        });
      })
      return markers;
    },
    lines() {
      return this.text?.split("\n") || [];
    },
    lineGutters() {
      const lineGutters: LineGutter[] = []
      _.forEach(this.signs, (_i, key) => {
        const type = this.signs[key]
        const line = findKeyPosition(this.text, [key]);
        if (line === -1) {
          log.warn(`Failed to sign key \`${key}\`. \`${key}\` is not found.`)
          return
        }
        lineGutters.push({ line, type });
      })
      return lineGutters;
    },
    editableRanges() {
      const editablePaths = this.editablePaths

      if (_.isEmpty(editablePaths)) {
        return []
      }

      const ranges = []

      editablePaths.forEach((path: string) => {
        const pointer = JsonPointer.compile(path.split("."))
        const position = this.sourceMap.pointers[pointer]

        if (!position) {
          log.warn(`Unable to find editable path \`${path}\` in value object.`)
          return
        }

        ranges.push({
          id: path,
          from: { line: position.value.line, ch: position.value.column },
          to: { line: position.valueEnd.line, ch: position.valueEnd.column },
        })
      })

      return ranges
    },
    menuOptions() {
      return [
        {
          name: "Copy Visible",
          handler: () => {
            this.$native.clipboard.writeText(this.text);
          },
        },
        {
          name: "Collapse all",
          handler: () => {
            this.foldAll++;
          },
        },
        {
          name: "Expand all",
          handler: () => {
            this.unfoldAll++;
          },
        },
        {
          name: "Always Expand Foreign Keys",
          handler: () => {
            this.$store.dispatch("toggleExpandFKDetailsByDefault");
          },
          checked: this.expandFKDetailsByDefault,
        },
        {
          name: "Wrap Text",
          handler: () => {
            this.wrapText = !this.wrapText
          },
          checked: this.wrapText,
        },

      ]
    },
    ...mapGetters(["expandFKDetailsByDefault"]),
  },
  methods: {
    replacer(_key: string, value: unknown) {
      // HACK: this is the case in mongodb objectid
      if (value && typeof value === "object" && _.isTypedArray((value as any).buffer)) {
        return typedArrayToString((value as any).buffer, this.binaryEncoding)
      }
      if (_.isTypedArray(value)) {
        return typedArrayToString(value as ArrayBufferView, this.binaryEncoding)
      }
      return value
    },
    expandPath(path: ExpandablePath) {
      this.$emit("expandPath", path);
    },
    setFilter(filter: string) {
      this.$emit("bks-filter-change", { filter });
    },
    replaceExtensions(extensions) {
      // Disable the default CodeMirror search functionality
      const disableSearchKeymap = keymap.of([
        {
          key: "Mod-f",
          run: () => true // Return true to prevent default behavior
        }
      ]);

      // Custom theme to hide the default search panel completely
      const hideDefaultSearchPanel = EditorView.theme({
        ".cm-panel.cm-search": {
          display: "none !important"
        }
      });

      return [
        extensions,
        disableSearchKeymap,
        hideDefaultSearchPanel,
        monokai,
        this.persistJsonFold.extensions,
        this.partialReadonly.extensions(this.editableRanges),
      ]
    },
    // Custom search methods
    getTextEditor() {
      // Get reference to the text editor component
      return this.$refs.textEditor?.textEditor;
    },
    debouncedPerformSearch: _.debounce(function() {
      this.performSearch();
    }, 300),
    performSearch() {
      const editor = this.getTextEditor();
      if (!editor || !this.searchQuery) {
        this.currentMatch = 0;
        this.totalMatches = 0;
        this.searchMatches = [];
        return;
      }

      try {
        // Clear previous search highlights and find all matches
        const content = editor.view.state.doc.toString();
        console.log('Searching in content:', content.substring(0, 100) + '...');
        console.log('Search query:', this.searchQuery);
        
        const matches = [];
        let match;
        
        if (this.useRegex) {
          try {
            const flags = this.matchCase ? 'g' : 'gi';
            const regex = new RegExp(this.searchQuery, flags);
            while ((match = regex.exec(content)) !== null) {
              matches.push({ from: match.index, to: match.index + match[0].length });
              if (!regex.global) break;
            }
          } catch (regexError) {
            console.warn('Invalid regex:', regexError);
            return;
          }
        } else {
          const searchText = this.matchCase ? this.searchQuery : this.searchQuery.toLowerCase();
          const searchContent = this.matchCase ? content : content.toLowerCase();
          let index = 0;
          
          while ((index = searchContent.indexOf(searchText, index)) !== -1) {
            const matchEnd = index + searchText.length;
            
            if (this.wholeWord) {
              const beforeChar = index > 0 ? content[index - 1] : '';
              const afterChar = matchEnd < content.length ? content[matchEnd] : '';
              const isWordBoundary = /\W/.test(beforeChar) && /\W/.test(afterChar);
              
              if (isWordBoundary || (index === 0 && /\W/.test(afterChar)) || (matchEnd === content.length && /\W/.test(beforeChar))) {
                matches.push({ from: index, to: matchEnd });
              }
            } else {
              matches.push({ from: index, to: matchEnd });
            }
            
            index = matchEnd; // Move past this match
          }
        }

        this.searchMatches = matches;
        this.totalMatches = matches.length;
        
        console.log('Found matches:', matches.length);
        
        if (matches.length > 0) {
          this.currentMatch = 1;
          this.highlightCurrentMatch();
        } else {
          this.currentMatch = 0;
        }
        
        // Restore focus to search input if it was focused
        if (this.searchInputFocused) {
          this.$nextTick(() => {
            if (this.$refs.searchInput) {
              this.$refs.searchInput.focus();
            }
          });
        }
      } catch (error) {
        console.warn('Search error:', error);
        this.totalMatches = 0;
        this.currentMatch = 0;
        this.searchMatches = [];
      }
    },
    highlightCurrentMatch() {
      if (this.searchMatches.length === 0 || this.currentMatch === 0) return;
      
      const editor = this.getTextEditor();
      if (!editor) return;

      const match = this.searchMatches[this.currentMatch - 1];
      if (match) {
        console.log('Highlighting match:', match);
        // Set cursor to the match position without focusing the editor
        editor.view.dispatch({
          selection: { anchor: match.from, head: match.to },
          scrollIntoView: true
        });
        
        // Don't focus the editor automatically to keep focus on search input
        // Only focus when user explicitly clicks next/previous buttons
      }
    },
    findNext() {
      if (this.searchMatches.length === 0) return;
      
      this.currentMatch = this.currentMatch >= this.totalMatches ? 1 : this.currentMatch + 1;
      this.highlightCurrentMatch();
      
      // Focus editor when user explicitly navigates
      const editor = this.getTextEditor();
      if (editor) {
        editor.view.focus();
      }
    },
    findPrevious() {
      if (this.searchMatches.length === 0) return;
      
      this.currentMatch = this.currentMatch <= 1 ? this.totalMatches : this.currentMatch - 1;
      this.highlightCurrentMatch();
      
      // Focus editor when user explicitly navigates
      const editor = this.getTextEditor();
      if (editor) {
        editor.view.focus();
      }
    },
    // Navigation methods for keyboard input (don't focus editor)
    findNextFromInput() {
      if (this.searchMatches.length === 0) return;
      
      this.currentMatch = this.currentMatch >= this.totalMatches ? 1 : this.currentMatch + 1;
      this.highlightCurrentMatch();
      
      // Keep focus on search input instead of focusing editor
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    findPreviousFromInput() {
      if (this.searchMatches.length === 0) return;
      
      this.currentMatch = this.currentMatch <= 1 ? this.totalMatches : this.currentMatch - 1;
      this.highlightCurrentMatch();
      
      // Keep focus on search input instead of focusing editor
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    toggleMatchCase() {
      this.matchCase = !this.matchCase;
      if (this.searchQuery) {
        this.performSearch();
      }
      // Refocus search input after toggle
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    toggleWholeWord() {
      this.wholeWord = !this.wholeWord;
      if (this.searchQuery) {
        this.performSearch();
      }
      // Refocus search input after toggle
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    toggleRegex() {
      this.useRegex = !this.useRegex;
      if (this.searchQuery) {
        this.performSearch();
      }
      // Refocus search input after toggle
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    toggleReplace() {
      this.showReplace = !this.showReplace;
      if (this.showReplace) {
        this.$nextTick(() => {
          this.$refs.replaceInput?.focus();
        });
      }
    },
    replaceNext() {
      if (!this.replaceQuery || this.searchMatches.length === 0 || this.currentMatch === 0) return;
      
      const editor = this.getTextEditor();
      if (!editor) return;

      const match = this.searchMatches[this.currentMatch - 1];
      if (match) {
        editor.view.dispatch({
          changes: { from: match.from, to: match.to, insert: this.replaceQuery },
          selection: { anchor: match.from + this.replaceQuery.length }
        });
        
        // Refresh search results after replacement
        setTimeout(() => this.performSearch(), 50);
      }
    },
    replaceAll() {
      if (!this.replaceQuery || this.searchMatches.length === 0) return;
      
      const editor = this.getTextEditor();
      if (!editor) return;

      // Replace all matches from end to beginning to maintain positions
      const changes = this.searchMatches
        .sort((a, b) => b.from - a.from)
        .map(match => ({ from: match.from, to: match.to, insert: this.replaceQuery }));

      if (changes.length > 0) {
        editor.view.dispatch({ changes });
        
        // Refresh search results after replacement
        setTimeout(() => this.performSearch(), 50);
      }
    },
    handleEditableRangeChange: _.debounce(function (range, value) {
      this.editableRangeErrors = []
      try {
        const parsed = JSON.parse(value)
        this.$emit("bks-json-value-change", {key: range.id, value: parsed});
      } catch (error) {
        this.editableRangeErrors.push({ id: range.id, error, from: range.from, to: range.to })
      }
    }, 250),
    getMenuOptions() {
      return this.menuOptions;
    },
  },
  mounted() {
    this.partialReadonly.addListener("change", this.handleEditableRangeChange)
    
    // Focus search input when component is mounted
    this.$nextTick(() => {
      if (this.$refs.searchInput) {
        this.$refs.searchInput.focus();
      }
    });
  },
  beforeDestroy() {
    this.partialReadonly.removeListener("change", this.handleEditableRangeChange)
  },
});
</script>

<style scoped>
.custom-search-panel {
  border-bottom: 1px solid var(--bks-border-color);
  background: var(--bks-query-editor-bg);
  padding: 8px 12px;
  font-family: var(--bks-font-family);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.replace-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.search-input-container {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
}

.replace-input-container {
  flex: 1;
  margin-left: 24px; /* Align with search input */
}

.search-input, .replace-input {
  width: 100%;
  padding: 4px 8px;
  padding-right: 100px; /* Space for controls */
  border: 1px solid var(--bks-border-color);
  border-radius: 3px;
  background: var(--bks-form-control-bg-color);
  color: var(--bks-text-dark);
  font-size: 12px;
  font-family: var(--bks-font-family);
}

.search-input:focus, .replace-input:focus {
  outline: none;
  border-color: var(--bks-brand-info);
}

.search-controls {
  position: absolute;
  right: 4px;
  display: flex;
  gap: 2px;
}

.search-control-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bks-text-light);
  transition: all 0.15s ease;
}

.search-control-btn:hover {
  background: var(--bks-brand-info-light);
  color: var(--bks-text-dark);
}

.search-control-btn.active {
  background: var(--bks-brand-info);
  color: white;
}

.search-control-btn .material-icons {
  font-size: 14px;
}

.search-navigation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-results {
  font-size: 11px;
  color: var(--bks-text-light);
  min-width: 60px;
  text-align: center;
}

.nav-btn, .toggle-replace-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bks-text-light);
  transition: all 0.15s ease;
}

.nav-btn:hover, .toggle-replace-btn:hover {
  background: var(--bks-brand-info-light);
  color: var(--bks-text-dark);
}

.toggle-replace-btn.active {
  background: var(--bks-brand-info);
  color: white;
}

.nav-btn .material-icons, .toggle-replace-btn .material-icons {
  font-size: 16px;
}

.replace-actions {
  display: flex;
  gap: 4px;
}

.replace-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bks-text-light);
  transition: all 0.15s ease;
}

.replace-btn:hover {
  background: var(--bks-brand-info-light);
  color: var(--bks-text-dark);
}

.replace-btn .material-icons {
  font-size: 16px;
}

.nav-btn:disabled, .replace-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn:disabled:hover, .replace-btn:disabled:hover {
  background: transparent;
}
</style>
