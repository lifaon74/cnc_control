import { ByteStepDecoder } from '../byte-step/ByteStepDecoder';
import { GetPointerFunction, Pointer } from '../types';
import { ByteDecoder } from '../byte/ByteDecoder';
import { Any } from './types';
import { SizeDecoder } from '../size/SizeDecoder';
import { NumberDecoder } from '../number/NumberDecoder';
import { StringDecoder } from '../string/StringDecoder';
import { NumberObjectDecoder } from '../number-object/NumberObjectDecoder';
import { StringObjectDecoder } from '../string-object/StringObjectDecoder';
import { DateDecoder } from '../date/DateDecoder';
import { RegExpDecoder } from '../regexp/RegExpDecoder';
import { ArrayBufferDecoder } from '../array-buffer/ArrayBufferDecoder';
import { MapDecoder } from '../map/MapDecoder';


export class AnyDecoder extends ByteStepDecoder<any> {
  protected _getPointer: GetPointerFunction;
  protected _memory: Map<Pointer, any>;
  protected _pointer: Pointer;

  protected _decoder: ByteDecoder<any>;
  protected _endStep: number;

  constructor(getPointer: GetPointerFunction,
              memory: Map<Pointer, any> = new Map<Pointer, any>()) {
    super(false);
    this._getPointer = getPointer;
    this._memory = memory;
  }

  protected _next(value: number): void {
    while(true) {
      switch(this._step) {
        case 0:
          this._endStep = 102;

          if(value === Any.POINTER) {
            this._decoder = new SizeDecoder();
            this._endStep = 104;
            this._step = 100;
            break;
          } else if(value === Any.PRIMITIVES.UNDEFINED) {
            this._done = true;
            this._output = void 0;
          } else if(value === Any.PRIMITIVES.NULL) {
            this._done = true;
            this._output = null;
          } else if((value & ~Any.MASKS.BOOLEAN) === Any.PRIMITIVES.BOOLEAN) {
            this._done = true;
            this._output = (value & Any.MASKS.BOOLEAN) === 1;
          } else if((value & ~Any.MASKS.NUMBER) === Any.PRIMITIVES.NUMBER) {
            this._decoder = new NumberDecoder();
            this._decoder.next(value & Any.MASKS.NUMBER);
            this._step = 100;
            break;
          } else if(value === Any.PRIMITIVES.STRING) {
            this._decoder = new StringDecoder();
            this._step = 100;
            break;
          } else {
            this._pointer = this._getPointer();
            this._endStep = 103;

            if((value & ~Any.MASKS.BOOLEAN) === Any.OBJECTS.BOOLEAN) {
              this._done = true;
              this._output = new Boolean((value & Any.MASKS.BOOLEAN) === 1);
            } else if((value & ~Any.MASKS.NUMBER) === Any.OBJECTS.NUMBER) {
              this._decoder = new NumberObjectDecoder();
              this._decoder.next(value & Any.MASKS.NUMBER);
              this._step = 100;
              break;
            } else if(value === Any.OBJECTS.STRING) {
              this._decoder = new StringObjectDecoder();
              this._step = 100;
              break;
            } else if(value === Any.OBJECTS.DATE) {
              this._decoder = new DateDecoder();
              this._step = 100;
              break;
            } else if(value === Any.OBJECTS.REGEXP) {
              this._decoder = new RegExpDecoder();
              this._step = 100;
              break;
            } else if(value === Any.OBJECTS.ARRAY_BUFFER) {
              this._decoder = new ArrayBufferDecoder();
              this._step = 100;
              break;




            } else if(value === Any.OBJECTS.MAP) {
              this._decoder = new MapDecoder(this._getPointer, this._memory, this._pointer);
              this._step = 100;
              break;
            }
          }
          return;



        case 100: // iterate
          this._done = this._decoder.done;
          if(this._done) {
            this._step = this._endStep;
            break;
          }
          this._step = 101;
          return;
        case 101:
          this._decoder.next(value);
          this._step = 100;
          break;

        case 102: // generic end step
          this._output = this._decoder.output;
          return;

        case 103: // generic object end step
          this._output = this._decoder.output;
          this._memory.set(this._pointer, this._output);
          return;

        case 104: // pointer
          if(this._memory.has(this._decoder.output)) {
            this._output = this._memory.get(this._decoder.output);
          } else {
            throw new TypeError('Find a pointer without valid pointed value');
          }
          return;

        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
