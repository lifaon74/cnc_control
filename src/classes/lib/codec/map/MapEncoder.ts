import { ByteStepEncoder } from '../byte-step/ts/ByteStepEncoder';
import { GetPointerFunction, Pointer } from '../types';
import { SizeEncoder } from '../size/SizeEncoder';
import { AnyEncoder } from '../any/AnyEncoder';

export class MapEncoder<TKey = any, TValue = any> extends ByteStepEncoder<Map<TKey, TValue>> {
  protected _getPointer: GetPointerFunction;
  protected _memory: Map<Pointer, any>;

  protected _sizeEncoder: SizeEncoder;
  protected _mapIterator: IterableIterator<[TKey, TValue]>;
  protected _mapIteratorResult: IteratorResult<[TKey, TValue]>;

  protected _anyEncoder: AnyEncoder;

  constructor(input: Map<TKey, TValue>,
              getPointer: GetPointerFunction,
              memory: Map<any, Pointer> = new Map<any, Pointer>()) {
    super(input, false);
    this._getPointer = getPointer;
    this._memory = memory;
    this._init();
  }

  protected _next(): number {
    /*
      yield* this.serializeSize(map.size);

      for(const entry of map.entries()) {
        yield* this.serialize(entry[0], getPointer, memory);
        yield* this.serialize(entry[1], getPointer, memory);
      }
     */
    while(true) {
      switch(this._step) {
        case 0:
          this._sizeEncoder = new SizeEncoder(this._input.size);
          this._step = 1;
        case 1:
          if(this._sizeEncoder.done) {
            // delete this._sizeEncoder;
            this._mapIterator = this._input.entries();
            this._step = 2;
          } else {
            return this._sizeEncoder.next();
          }
        case 2:
          this._mapIteratorResult = this._mapIterator.next();
          this._done = this._mapIteratorResult.done;
          if(this._done) return 0;
          this._anyEncoder = new AnyEncoder(this._mapIteratorResult.value[0], this._getPointer, this._memory);
          this._step = 3;
        case 3:
          if(this._anyEncoder.done) {
            // delete this._anyEncoder;
            this._anyEncoder = new AnyEncoder(this._mapIteratorResult.value[1], this._getPointer, this._memory);
            this._step = 4;
          } else {
            return this._anyEncoder.next();
          }
        case 4:
          if(this._anyEncoder.done) {
            // delete this._anyEncoder;
            this._step = 2;
            break;
          } else {
            return this._anyEncoder.next();
          }
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
