#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCALE_DIR = path.join(__dirname, '../apps/studio/src/i18n/locales');
const LOCALES = ['zh-CN']; // Add more locales as needed

// Helper function to extract $t('...') strings from content
function extractTranslationKeys(content) {
  const regex = /\$t\(['"](.+?)['"]\)/g;
  const keys = new Set();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  return Array.from(keys);
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

// Extract keys from changed files
function extractKeysFromChangedFiles() {
  const changedFiles = getChangedFiles();
  console.log(`Found ${changedFiles.length} changed files to scan`);
  
  const allKeys = new Set();
  
  for (const file of changedFiles) {
    try {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) continue;
      
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
      
      // Find new keys
      for (const key of keys) {
        if (!translations[key]) {
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
  console.log('Extracting translation keys from changed files...');
  const keys = extractKeysFromChangedFiles();
  updateLocaleFiles(keys);
}

main();