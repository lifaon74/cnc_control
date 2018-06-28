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

  const sharedBuffer1 = new addon.NodeSharedBuffer('hello', 10);
  // console.log(sharedBuffer1.key, sharedBuffer1.size, sharedBuffer1.opened, sharedBuffer1.buffer);

  sharedBuffer1.open(true);
  const buffer1 = new Uint8Array(sharedBuffer1.buffer);

  const sharedBuffer2 = new addon.NodeSharedBuffer('hello', 10);
  sharedBuffer2.open();
  const buffer2 = new Uint8Array(sharedBuffer2.buffer);

  buffer1[0] = 1;
  console.log(buffer1, buffer2);

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