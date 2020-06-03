
export type TArrayLikeConstructor<T> = new(size: number, ...args: any[]) => ArrayLike<T>;
export type TArrayLikeTypedConstructor<TArrayLike extends ArrayLike<any>> = new(size: number, ...args: any[]) => TArrayLike;


export type TNumberArray = {
  readonly length: number;
  [n: number]: number;
};
