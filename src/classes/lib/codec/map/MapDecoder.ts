import { ByteStepDecoder } from '../byte-step/ByteStepDecoder';
import { GetPointerFunction, Pointer } from '../types';
import { SizeDecoder } from '../size/SizeDecoder';
import { AnyDecoder } from '../any/AnyDecoder';

export class MapDecoder<TKey = any, TValue = any> extends ByteStepDecoder<Map<TKey, TValue>> {
  protected _getPointer: GetPointerFunction;
  protected _memory: Map<Pointer, any>;
  protected _pointer: Pointer;

  protected _sizeDecoder: SizeDecoder;
  protected _length: number;
  protected _index: number;

  protected _anyDecoder: AnyDecoder;
  protected _key: TKey;

  constructor(getPointer: GetPointerFunction,
              memory: Map<Pointer, any> = new Map<Pointer, any>(),
              pointer: Pointer = getPointer()) {
    super(false);
    this._getPointer = getPointer;
    this._memory = memory;
    this._pointer = pointer;
    this._init();
  }


  protected _next(value: number): void {
    /*
      const size: number = yield* this.deserializeSize();
      const map: Map<any, any> = new Map<any, any>();
      memory.set(pointer, map);
      for(let i = 0; i < size; i++) {
        const key: any = yield* this.deserialize(getPointer, memory);
        const value: any = yield* this.deserialize(getPointer, memory);
        map.set(key, value);
      }
      return map;
     */
    while(true) {
      // console.log('this._step', this._step, value);
      switch(this._step) {
        case 0:
          this._sizeDecoder = new SizeDecoder();

        case 1:
          if(this._sizeDecoder.done) {
            this._length = this._sizeDecoder.output;
            this._index = 0;
            // delete this._sizeDecoder;
            this._output = new Map<TKey, TValue>();
            this._memory.set(this._pointer, this._output);
            this._step = 3;
            break;
          } else {
            this._step = 2;
            return;
          }
        case 2:
          this._sizeDecoder.next(value);
          this._step = 1;
          break;
        case 3:
          this._done = (this._index >= this._length);
          if(this._done) return;
          this._anyDecoder = new AnyDecoder(this._getPointer, this._memory);
        case 4:
          if(this._anyDecoder.done) {
            // delete this._anyDecoder;
            this._key = this._anyDecoder.output;
            this._anyDecoder = new AnyDecoder(this._getPointer, this._memory);
            this._step = 6;
            break;
          }
          this._step = 5;
          return;
        case 5:
          this._anyDecoder.next(value);
          this._step = 4;
          break;
        case 6:
          if(this._anyDecoder.done) {
            this._output.set(this._key, this._anyDecoder.output);
            // delete this._anyDecoder;
            this._index++;
            this._step = 3;
            break;
          }
          this._step = 7;
          return;
        case 7:
          this._anyDecoder.next(value);
          this._step = 6;
          break;
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
