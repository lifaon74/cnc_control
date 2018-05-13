import * as $cluster from 'cluster';
import { $delay } from '../classes/misc';
import { SharedBufferStream } from './SharedBufferStream';
import * as $fs from 'fs';


async function _masterProgram(): Promise<void> {
  const sharedArray: SharedBufferStream = SharedBufferStream.createMaster();
  let i: number = 123;

  while(true) {
    if(sharedArray.readable) {
      sharedArray.receive();
      console.log('set', i);
      sharedArray.data = new Uint8Array([i]);
      sharedArray.send();
      i = (i + 1) % 256;
    }
    // console.log('set', sharedArray.join(', '));
    await $delay(1000);
  }
}

async function _forkProgram(): Promise<void> {
  console.log('forkProgram');
  const sharedArray: SharedBufferStream = SharedBufferStream.create();
  let i: number = -1;

  while(true) {
    if(sharedArray.readable) {
      sharedArray.receive();
      i = sharedArray.data[0];
      console.log('get', i);
      sharedArray.send();
    }
    // console.log('get', sharedArray.join(', '));
    // await $delay(1000);
  }
}


function masterProgram(): void {
  const sharedArray: SharedBufferStream = SharedBufferStream.createMaster();
  const file: number = $fs.openSync('../assets/test.bin.agcode', 'r');

  let i: number = 0;

  while(true) {
    if(sharedArray.readable) {
      sharedArray.receive();
      const bytesRead: number = $fs.readSync(file, sharedArray.buffer, SharedBufferStream.START_OFFSET, sharedArray.maxSize, i);
      if(bytesRead > 0) {
        i += bytesRead;
        sharedArray.size = bytesRead;
        console.log(sharedArray.data.slice(0, 70).join(', '));
        console.log('send');
        sharedArray.send();
      } else {
        break;
      }
    }
  }

  console.log('Master program end');
}

function forkProgram(): void {
  require(__dirname + '/loop.js');
}


if ($cluster.isMaster) {
  console.log(`Master ${process.pid} is running, CPU: ${require('os').cpus().length}`);

  $cluster.fork();

  $cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });

  masterProgram();
} else {
  require('./c/run.js');
  // forkProgram();
}
