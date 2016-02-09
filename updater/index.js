// only ES5 is allowed in this file
require('babel-register')();

// load the update and run it
require('./updater').doTheThing();
