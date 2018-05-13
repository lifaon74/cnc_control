'use strict';
// const binding = require(`binding`);
// // module.exports = require('bindings')('shared-buffer');
//
// console.log('binding.hello() =', binding.hello());

const addon = require('./build/Release/binding');


console.log(addon.start());
console.log('test');