const { EOL } = require('os');
const fs = require('fs');
const path = require('path');

const prependWarningText = ({
  eslintDisableLine, fileList, log, warningText,
}) => {
  const prependedData = `${eslintDisableLine}${EOL}${warningText}`;
  log('Data to be prepended:');
  log('---Begin---');
  log(prependedData);
  log('----End----');
  fileList.forEach((file) => {
    const data = fs.readFileSync(path.resolve(file), 'utf8');
    if (data.includes('/* eslint-disable */')) {
      log(`${file} already has ESLint disabled, ignoring`);
      return;
    }
    if (data.startsWith('#!')) {
      const firstLine = data.split(EOL)[0];
      const remainingLines = data.split(EOL).slice(1, -1).join(EOL);
      const fullData = `${firstLine}${EOL}${prependedData}${EOL}${EOL}${remainingLines}`;
      fs.writeFileSync(path.resolve(file), fullData, 'utf8');
      log(`Data was prepended to ${file} while preserving shebang`);
      return;
    }
    const fullData = `${prependedData}${EOL}${EOL}${data}`;
    fs.writeFileSync(path.resolve(file), fullData, 'utf8');
    log(`Data was prepended to ${file}`);
  });
};

const getIgnoredFiles = ({ log }) => {
  try {
    const data = fs.readFileSync('.eslintignore', 'utf8');
    log('Found .eslintignore');
    const ignoredFiles = data.split(EOL);
    return ignoredFiles;
  } catch (error) {
    if (error.message.startsWith('ENOENT')) {
      log('No .eslintignore found, using default of \'node_modules\'');
      return ['node_modules'];
    }
    throw error;
  }
};

const getJavaScriptFiles = ({
  directory, log, fileList = [], searchHistory = [], originalDirectory = directory,
}) => {
  if (directory.length < originalDirectory.length) {
    log(`Searching finished at ${originalDirectory}`);
    return fileList;
  }

  const parentDirectory = directory.slice(0, directory.lastIndexOf('/'));

  if (searchHistory.includes(directory)) {
    log(`${directory} has already been searched (early return case)`);
    return getJavaScriptFiles({
      directory: parentDirectory, log, fileList, searchHistory, originalDirectory,
    });
  }

  log(`Searching ${directory}`);
  const filesAndDirectories = fs.readdirSync(path.resolve(directory))
    .map(fileOrDirectory => `${directory}/${fileOrDirectory}`);
  const directories =
    filesAndDirectories.filter(file => fs.statSync(path.resolve(file)).isDirectory());
  for (let i = 0; i < directories.length; i += 1) {
    if (!searchHistory.includes(directories[i])) {
      log(`${directory} has already been searched (for loop)`);
      return getJavaScriptFiles({
        directory: directories[i], log, fileList, searchHistory, originalDirectory,
      });
    }
  }

  const files = filesAndDirectories.filter(file => !fs.statSync(file).isDirectory());
  const jsFilesInCurrentDirectory = [...files.filter(file => file.toLowerCase().endsWith('.js'))];
  const jsFiles = [...fileList, ...jsFilesInCurrentDirectory];

  const newSearchHistory = [...searchHistory, directory];

  if (!jsFilesInCurrentDirectory.length) {
    log(`No JavaScript files found in ${directory}`);
    return getJavaScriptFiles({
      directory: parentDirectory,
      log,
      fileList: jsFiles,
      searchHistory: newSearchHistory,
      originalDirectory,
    });
  }
  jsFilesInCurrentDirectory.forEach(file => log(`Found ${file}`));
  return getJavaScriptFiles({
    directory: parentDirectory,
    log,
    fileList: jsFiles,
    searchHistory: newSearchHistory,
    originalDirectory,
  });
};

module.exports = {
  getIgnoredFiles,
  getJavaScriptFiles,
  prependWarningText,
};
