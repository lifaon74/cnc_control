'use strict';
// const binding = require(`binding`);
// // module.exports = require('bindings')('shared-buffer');
//
// console.log('binding.hello() =', binding.hello());

try {
  const addon = require('./build/Release/binding');
  // global.obj = new addon.NodeSharedBuffer('hello', 10);
  // delete global.obj;
  // global.gc();

  const obj = new addon.NodeSharedBuffer('hello', 10);
  console.log(obj.key, obj.size, obj.opened, obj.buffer);

  obj.open(true);
  console.log(obj.opened, obj.buffer === obj.buffer);
  console.log('ok');
  // console.log(obj.buffer.byteLength);
  console.log(obj.buffer);


  // obj.close();
  // console.log('ok1');
  // addon.start();
} catch (error) {
  console.log('\n\n------------------CATCHED ERROR------------------\n\n');
  console.log(error);
  console.log('\n\n-------------------------------------------------\n\n');
}

// setTimeout(function() {
//   console.log('ok1');
// }, 20000);