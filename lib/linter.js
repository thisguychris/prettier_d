'use strict';

var fs = require('fs');
var resolve = require('resolve');
var options = require('./options');
var path = require('path');
var unquote = require('unquote');
var stringifySorted = require('json-stable-stringify');
var stringifyAligned = require('json-align');

var prettierMap = {};

module.exports = function (cwd, args, text) {
  process.chdir(cwd);
  var cwdDeps = prettierMap[cwd];
  if (!cwdDeps) {
    var prettierPath;
    try {
      prettierPath = resolve.sync('prettier', { basedir: cwd });
    } catch (e) {
      // module not found
      prettierPath = resolve.sync('prettier');
    }
    cwdDeps = prettierMap[cwd] = {
      prettier: require(prettierPath)
    };
  }
  var currentOptions;
  try {
    currentOptions = options.parse([0, 0].concat(args));
  } catch (e) {
    return e.message + '\n# exit 1';
  }
  var files = currentOptions._;
  var stdin = currentOptions.stdin;
  if (!files.length && (!stdin || typeof text !== 'string')) {
    return options.generateHelp() + '\n';
  }
  var report;
  if (!stdin) {
    text = fs
      .readFileSync(path.resolve(cwd, unquote(files[0])).trim())
      .toString();
  }
  try {
    report = cwdDeps.prettier.format(text, currentOptions);
  } catch (err) {
    // try to format JSON files
    // prettier doesn't do this currently:
    // https://github.com/prettier/prettier/issues/322
    try {
      if (!currentOptions.json) {
        throw err;
      }
      var sorted = stringifyAligned(
        JSON.parse(stringifySorted(JSON.parse(text))),
        null,
        currentOptions.tabWidth,
        true
      );
      // Put a comma after strings, numbers, objects, arrays, `true`, `false`,
      // or `null` at the end of a line. See the grammar at http://json.org/
      report = sorted.replace(/(.["\d}\]el])$/gm, '$1,');
    } catch (err) {
      if (!currentOptions.fallback) {
        throw err;
      }
      report = text;
    }
  }
  return report;
};