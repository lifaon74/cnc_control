import { TNumberArray } from './types';

export function FloatEquals(
  a: number,
  b: number,
  epsilon: number = 1e-6
): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function FloatIsNull(
  a: number,
  epsilon: number = 1e-6
): boolean {
  return Math.abs(a) <= epsilon;
}

export function FloatToString(
  a: number,
  precision: number
): string {
  return a.toPrecision(precision).replace(/\.?0+$/g, '');
}

export function MatrixToString(matrix: TNumberArray, rowCount: number, columnCount: number, precision: number = 5): string {
  const _matrix: string[] = Array.from(matrix, (value: number) => {
    return (precision <= 0)
      ? value.toString(10)
      : FloatToString(value, precision);
  });
  // const maxLength: number = _matrix.reduce((maxLength: number, value: string) => Math.max(maxLength, value.length), 0);
  const maxLengths: number[] = Array.from({ length: columnCount }, (v: any, column: number) => {
    return Array.from({ length: rowCount }, (v: any, i: number) => i).reduce((maxLength: number, row: number) => {
      return Math.max(maxLength, _matrix[rowCount * column + row].length);
    }, 0)
  });

  return Array.from({ length: rowCount }, (v: any, row: number) => {
    return Array.from({ length: columnCount }, (v: any, column: number) => _matrix[rowCount * column + row].padStart(maxLengths[column], ' ')).join('  ');
  }).join('\n');
}
