import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Correct paths to the files
const packageJsonPath = resolve(__dirname, './package.json');
const appJsxPath = resolve(__dirname, './src/App.jsx');
const versionJsonPath = resolve(__dirname, './public/version.json');

// Read the package.json file
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Get the current date and time in the format yyyymmdd-hhmm
const now = new Date();
const formattedDate = now.toISOString().replace(/[-:T]/g, '').slice(0, 8) + '-' + now.toTimeString().slice(0, 5).replace(/:/g, '');

// Update the releaseDate field
packageJson.releaseDate = formattedDate;

// Write the updated package.json file
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

console.log(`✅ Updated releaseDate to ${formattedDate}`);

// Create/update version.json file
try {
    const versionInfo = {
        version: packageJson.version,
        releaseDate: formattedDate
    };

    writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2), 'utf8');
    console.log(`✅ Created/updated version.json with version ${packageJson.version}`);
} catch (error) {
    console.error(`❌ Error updating version.json: ${error.message}`);
}

// Now update the version in App.jsx
try {
    // Read the App.jsx file
    let appJsxContent = readFileSync(appJsxPath, 'utf8');

    // Get the current version from package.json
    const currentVersion = packageJson.version;

    // Replace the version in the JSDoc comment
    const updatedContent = appJsxContent.replace(
        /@version\s+([0-9]+\.[0-9]+\.[0-9]+)/,
        `@version ${currentVersion}`
    );

    // Write the updated App.jsx file
    writeFileSync(appJsxPath, updatedContent, 'utf8');

    console.log(`✅ Updated App.jsx @version to ${currentVersion}`);
} catch (error) {
    console.error(`❌ Error updating App.jsx version: ${error.message}`);
}

// Update the cache version in service-worker.js
try {
    const serviceWorkerPath = resolve(__dirname, './public/service-worker.js');
    let serviceWorkerContent = readFileSync(serviceWorkerPath, 'utf8');

    const currentVersion = packageJson.version;

    // Replace the CACHE_NAME with the new version
    const updatedContent = serviceWorkerContent.replace(
        /const CACHE_NAME = 'dyndns-updater-v[0-9]+\.[0-9]+\.[0-9]+'/,
        `const CACHE_NAME = 'dyndns-updater-v${currentVersion}'`
    );

    writeFileSync(serviceWorkerPath, updatedContent, 'utf8');

    console.log(`✅ Updated service-worker.js CACHE_NAME to v${currentVersion}`);
} catch (error) {
    console.error(`❌ Error updating service-worker.js: ${error.message}`);
}