
export function helloWorld() {
  console.log('Hello world');
  // INFO: import.meta is supported when bundling
  // @ts-ignore
  console.log(import.meta.url);
}
