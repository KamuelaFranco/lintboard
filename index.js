#!/usr/bin/env node
const path = require('path');
const program = require('commander');
const { getIgnoredFiles, getJavaScriptFiles, prependWarningText } = require('./lib');

const eslintDisableLine = '/* eslint-disable */';
let warningTextValue = '// TODO: Remove previous line and work through linting issues at next edit';
let initialDirectory = '';

program
  .version('1.0.0')
  .arguments('<directory> [warning text]')
  .action((directory, warningText) => {
    initialDirectory = directory;
    if (warningText) {
      warningTextValue = warningText;
    }
  })
  .option('-v, --verbose', 'Display output (useful for debugging)')
  .parse(process.argv);

// eslint-disable-next-line no-console
const log = program.verbose ? console.log : () => {};

if (!initialDirectory) {
  // eslint-disable-next-line no-console
  console.error('Error: No directory specified, use \'.\' for current');
  process.exit(1);
}

const fullPathToDirectory = path.join(process.cwd(), initialDirectory);

log('Beginning file search...');
const javascriptFiles =
  getJavaScriptFiles({ directory: fullPathToDirectory, log });
log('Importing ignored files...');
const ignoredFiles = getIgnoredFiles({ log });
log('Tabulating a diff list of files to append...');
const filesToPrepend = javascriptFiles.filter(file => !ignoredFiles.includes(file));
log('Beginning prepend operation...');
prependWarningText({
  fileList: filesToPrepend, warningText: warningTextValue, log, eslintDisableLine,
});
log('Operation completed successfully');
