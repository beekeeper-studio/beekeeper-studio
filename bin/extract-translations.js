#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');

const LOCALE_DIR = path.join(__dirname, '../apps/studio/src/i18n/locales');
const LOCALES = ['zh-CN']; // Add more locales as needed

// Example/test keys that should be excluded
const EXCLUDED_KEYS = [
  'text',
  'text {var}',
  'text {var1} more {var2}',
  'sample text',
  'example'
];

// Helper function to normalize translation keys
// Removes escape characters to avoid duplications
function normalizeTranslationKey(key) {
  // Replace escaped single and double quotes and other common escapes
  return key.replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
}

// Helper function to extract i18n translation strings from content
function extractTranslationKeys(content) {
  const keys = new Set();
  
  // 1. Extract simple $t('...') or $t("...") patterns
  const simpleRegex = /\$t\(['"](.+?)['"]\)/g;
  let match;
  
  while ((match = simpleRegex.exec(content)) !== null) {
    if (!EXCLUDED_KEYS.includes(match[1])) {
      keys.add(normalizeTranslationKey(match[1]));
    }
  }
  
  // 2. Extract from patterns like $t('text {var1} more {var2}', {var1: x, var2: y})
  const interpolationRegex = /\$t\(['"](.+?)['"](?:,\s*\{.+?\})?\)/g;
  while ((match = interpolationRegex.exec(content)) !== null) {
    // Only add if it's not already added by the simpler regex and not excluded
    if (!EXCLUDED_KEYS.includes(match[1])) {
      keys.add(normalizeTranslationKey(match[1]));
    }
  }
  
  // 3. Extract from v-tooltip="$t('text {var}', {var: x})" patterns
  const attributeRegex = /v-\w+(?::[^=]+)?=["']\$t\(['"](.+?)['"](?:,\s*\{.+?\})?\)['"]/g;
  while ((match = attributeRegex.exec(content)) !== null) {
    if (!EXCLUDED_KEYS.includes(match[1])) {
      keys.add(normalizeTranslationKey(match[1]));
    }
  }
  
  // 4. Extract from JSX/TSX style: {$t('text')} or {$t("text")}
  const jsxRegex = /\{\s*\$t\(['"](.+?)['"]\)\s*\}/g;
  while ((match = jsxRegex.exec(content)) !== null) {
    if (!EXCLUDED_KEYS.includes(match[1])) {
      keys.add(normalizeTranslationKey(match[1]));
    }
  }
  
  // 5. Extract from template literal styles like `${$t('text')}`
  const templateLiteralRegex = /\$\{\s*\$t\(['"](.+?)['"]\)\s*\}/g;
  while ((match = templateLiteralRegex.exec(content)) !== null) {
    if (!EXCLUDED_KEYS.includes(match[1])) {
      keys.add(normalizeTranslationKey(match[1]));
    }
  }
  
  return Array.from(keys);
}

// Get all relevant files in project
function getAllFiles() {
  try {
    // Get all tracked files in the git repository
    const allFiles = execSync('git ls-files').toString().trim().split('\n');
    
    // Filter for .vue, .ts, and .js files
    return allFiles.filter(file => file && (file.endsWith('.vue') || file.endsWith('.ts') || file.endsWith('.js')));
  } catch (error) {
    console.error('Error getting all files:', error.message);
    return [];
  }
}

// Get changed files
function getChangedFiles() {
  try {
    // Get both staged and unstaged changes
    const stagedFiles = execSync('git diff --cached --name-only').toString().trim().split('\n');
    const unstagedFiles = execSync('git diff --name-only').toString().trim().split('\n');
    
    // Combine and filter for .vue and .ts files
    return [...new Set([...stagedFiles, ...unstagedFiles])]
      .filter(file => file && (file.endsWith('.vue') || file.endsWith('.ts') || file.endsWith('.js')));
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

// Extract keys from files
function extractKeysFromFiles(scanAll = false) {
  const files = scanAll ? getAllFiles() : getChangedFiles();
  console.log(`Found ${files.length} ${scanAll ? 'total' : 'changed'} files to scan`);
  
  const allKeys = new Set();
  
  for (const file of files) {
    try {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) continue;
      
      // Skip files that are likely to contain example code
      if (file.includes('examples/') || file.includes('test/') || file.includes('__tests__/')) {
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const keys = extractTranslationKeys(content);
      
      if (keys.length > 0) {
        console.log(`Found ${keys.length} translation keys in ${file}`);
        keys.forEach(key => allKeys.add(key));
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  
  return Array.from(allKeys);
}

// Update locale files with new keys
function updateLocaleFiles(keys) {
  if (keys.length === 0) {
    console.log('No new translation keys found.');
    return;
  }
  
  console.log(`Found ${keys.length} total unique translation keys to add`);
  
  for (const locale of LOCALES) {
    const localeFile = path.join(LOCALE_DIR, `${locale}.json`);
    
    if (!fs.existsSync(localeFile)) {
      console.error(`Locale file ${localeFile} does not exist.`);
      continue;
    }
    
    try {
      // Read existing translations
      const translations = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
      let newKeysCount = 0;
      const newKeys = [];
      
      // Find new keys, checking both original and normalized versions
      for (const key of keys) {
        // Check if the key (or its escaped version) already exists in translations
        const keyExists = translations[key] !== undefined || 
                          translations[key.replace(/'/g, "\\'")] !== undefined ||
                          translations[key.replace(/"/g, '\\"')] !== undefined;
        
        if (!keyExists) {
          newKeys.push(key);
          newKeysCount++;
        }
      }
      
      if (newKeysCount > 0) {
        // Add new keys at the bottom with null value
        // Using null instead of undefined because JSON.stringify drops undefined values
        // null will cause i18n to fall back to the default locale
        for (const key of newKeys) {
          translations[key] = null;
        }
        
        // Write back to file, maintaining original order with new keys at the end
        fs.writeFileSync(localeFile, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
        console.log(`Added ${newKeysCount} new keys to ${locale}.json`);
      } else {
        console.log(`No new keys to add to ${locale}.json`);
      }
    } catch (error) {
      console.error(`Error updating locale file ${localeFile}:`, error.message);
    }
  }
}

// Main function
function main() {
  // Check if --all flag is provided
  const scanAll = process.argv.includes('--all');
  
  console.log(`Extracting translation keys from ${scanAll ? 'all' : 'changed'} files...`);
  const keys = extractKeysFromFiles(scanAll);
  updateLocaleFiles(keys);
}

main();