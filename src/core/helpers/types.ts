
export type TArrayLikeConstructor<T> = new(size: number, ...args: any[]) => ArrayLike<T>;
export type TArrayLikeTypedConstructor<TArrayLike extends ArrayLike<any>> = new(size: number, ...args: any[]) => TArrayLike;

export type TArrayBufferView =
  Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;


export type TNumberArray = {
  readonly length: number;
  [n: number]: number;
};
