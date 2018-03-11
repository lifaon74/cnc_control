import { ByteEncoder } from './byte/ByteEncoder';
import { ByteDecoder } from './byte/ByteDecoder';


export function encode<T = any>(encoder: ByteEncoder<T>): number[] {
  const buffer: number[] = [];
  while(!encoder.done) {
    buffer.push(encoder.next());
  }
  return buffer;
}

export function decode<T = any>(decoder: ByteDecoder<T>, buffer: number[]): T {
  let i = 0;
  while(!decoder.done) {
    if(i >= buffer.length) throw new Error('Buffer overflow');
    decoder.next(buffer[i]);
    i++;
  }
  return decoder.output;
}

export function codec<T>(encoder: ByteEncoder<T>, decoder: ByteDecoder<T>): T {
  const buffer: number[] = encode(encoder);
  console.log(buffer);

  const output: T = decode(decoder, buffer);
  console.log(output);

  return output;
}
