import { TMatrixData } from './types';

export function FloatEquals(
  a: number,
  b: number,
  epsilon: number = 1e-6
): boolean {
  return Math.abs(a - b) < epsilon;
}

export function MatrixToString(matrix: TMatrixData, columnCount: number, rowCount: number, precision: number = -1): string {
  const _matrix: string[] = Array.from(matrix, (value: number) => {
    return (precision <= 0)
      ? value.toString(10)
      : value.toPrecision(precision);
  });
  const maxLength: number = _matrix.reduce((maxLength: number, value: string) => Math.max(maxLength, value.length), 0);

  return Array.from({ length: rowCount }, (v: any, row: number) => {
    return Array.from({ length: columnCount }, (v: any, column: number) => _matrix[rowCount * column + row].padStart(maxLength, ' ')).join(' ');
  }).join('\n');
}
