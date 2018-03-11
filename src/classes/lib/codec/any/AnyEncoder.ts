import { ByteStepEncoder } from '../byte-step/ByteStepEncoder';
import { DataCloneError, GetPointerFunction, Pointer } from '../types';
import { ByteEncoder } from '../byte/ByteEncoder';
import { SizeEncoder } from '../size/SizeEncoder';
import { Any } from './types';
import { NumberEncoder } from '../number/NumberEncoder';
import { StringEncoder } from '../string/StringEncoder';
import { NumberObjectEncoder } from '../number-object/NumberObjectEncoder';
import { StringObjectEncoder } from '../string-object/StringObjectEncoder';
import { DateEncoder } from '../date/DateEncoder';
import { RegExpEncoder } from '../regexp/RegExpEncoder';
import { ArrayBufferEncoder } from '../array-buffer/ArrayBufferEncoder';
import { MapEncoder } from '../map/MapEncoder';


export class AnyEncoder extends ByteStepEncoder<any> {

  protected _getPointer: GetPointerFunction;
  protected _memory: Map<any, Pointer>;
  protected _encoder: ByteEncoder<any>;

  constructor(input: any,
              getPointer: GetPointerFunction,
              memory: Map<any, Pointer> = new Map<any, Pointer>()) {
    super(input, false);
    this._getPointer = getPointer;
    this._memory = memory;
    this._init();
  }

  protected _next(): number {
    while(true) {
      switch(this._step) {
        case 0:
          if(this._memory.has(this._input)) {
            console.log('memory');
            this._encoder = new SizeEncoder(this._memory.get(this._input));
            this._done = this._encoder.done;
            this._step = 3;
            return Any.POINTER;
          } else {
            const type = typeof this._input;
            // p4
            if(type === 'undefined') {
              this._step = 2;
              return Any.PRIMITIVES.UNDEFINED;
            } else if(this._input === null) {
              this._step = 2;
              return Any.PRIMITIVES.NULL;
            } else if(type === 'boolean') {
              this._step = 2;
              return Any.PRIMITIVES.BOOLEAN | (this._input & Any.MASKS.BOOLEAN);
            } else if(type === 'number') {
              this._encoder = new NumberEncoder(this._input);
              this._done = this._encoder.done;
              this._step = 3;
              return Any.PRIMITIVES.NUMBER | (this._encoder.next() & Any.MASKS.NUMBER);
            } else if(type === 'string') {
              this._encoder = new StringEncoder(this._input);
              this._done = this._encoder.done;
              this._step = 3;
              return Any.PRIMITIVES.STRING;
            } else if(type === 'symbol') {  // p5
              throw new DataCloneError('Value could not be cloned: ' + String(this._input) + ' is a Symbol');
            } else {

              this._memory.set(this._input, this._getPointer()); // p6 & p23

              if(this._input instanceof Boolean) { // p7
                this._step = 2;
                return Any.OBJECTS.BOOLEAN | ((this._input.valueOf() as any) & Any.MASKS.BOOLEAN);
              } else if(this._input instanceof Number) { // p8
                this._encoder = new NumberObjectEncoder(this._input);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.NUMBER | (this._encoder.next() & Any.MASKS.NUMBER);
              } else if(this._input instanceof String) { // p9
                this._encoder = new StringObjectEncoder(this._input);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.STRING;
              } else if(this._input instanceof Date) { // p10
                this._encoder = new DateEncoder(this._input);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.DATE;
              } else if(this._input instanceof RegExp) { // p11
                this._encoder = new RegExpEncoder(this._input);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.REGEXP;
                // } else if((typeof SharedArrayBuffer !== 'undefined') && (value instanceof SharedArrayBuffer)) { // p12.2
                //   // if(forStorage) throw new DataCloneError('Value could not be cloned: is a SharedArrayBuffer');
                //   iterator = StructuredClone.serializeArrayBuffer(value);
                //   return [2, StructuredClone.SHARED_ARRAY_BUFFER];
              } else if(this._input instanceof ArrayBuffer) { // p12.3
                this._encoder = new ArrayBufferEncoder(this._input);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.ARRAY_BUFFER;
                // } else if(ArrayBuffer.isView(value)) { // p13
                //   iterator = StructuredClone.serializeArrayBufferView(value);
                //   return [2, StructuredClone.ARRAY_BUFFER_VIEW];
              } else if(this._input instanceof Map) { // p14
                this._encoder = new MapEncoder(this._input, this._getPointer, this._memory);
                this._done = this._encoder.done;
                this._step = 3;
                return Any.OBJECTS.MAP;
                // } else if(value instanceof Set) { // p15
                //   iterator = StructuredClone.serializeSet(value, getPointer, memory);
                //   return [2, StructuredClone.SET];
                // } else if(Array.isArray(value)) { // p16
                //   iterator = StructuredClone.serializeArray(value, getPointer, memory);
                //   return [2, StructuredClone.ARRAY];
                // } else if(!StructuredClone.isPlainObject(value)) { // p18
                //   // INFO super hard to implement
                //   let string: string = String(value);
                //   if(string.length > 200) string = string.substring(0, 150) + '\n[...]\n' + string.slice(-50);
                //   throw new DataCloneError('Unsupported type : ' + string);
                // } else {
                //   iterator = StructuredClone.serializeObject(value, getPointer, memory);
                //   return [2, StructuredClone.OBJECT];
                // }
              } else {
                throw true;
              }
            }
          }
        // return;

        case 2: // end
          this._done = true;
          return 0;

        case 3: // iterate
          this._done = this._encoder.done;
          return this._done ? 0 : this._encoder.next();



        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
