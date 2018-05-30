'use strict';
// const binding = require(`binding`);
// // module.exports = require('bindings')('shared-buffer');
//
// console.log('binding.hello() =', binding.hello());

const addon = require('./build/Release/binding');

try {
  addon.start();
} catch (error) {
  console.log('\n\n------------------CATCHED ERROR------------------\n\n');
  console.log(error);
  console.log('\n\n-------------------------------------------------\n\n');
}