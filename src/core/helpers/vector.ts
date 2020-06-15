import { TNumberArray } from './types';

export function VectorDistanceSquared(
  vectorA: TNumberArray,
  vectorB: TNumberArray,
): number {
  const vectorLength: number = vectorA.length;
  if (vectorA.length === vectorLength) {
    let value: number = 0;
    for (let i: number = 0; i < vectorLength; i++) {
      const v: number = vectorA[i] - vectorB[i];
      value += v * v;
    }
    return value;
  } else {
    throw new Error(`vectorB must have the same length as vectorA`);
  }
}

export function VectorDistance(
  vectorA: TNumberArray,
  vectorB: TNumberArray,
): number {
  return Math.sqrt(VectorDistanceSquared(vectorA, vectorB));
}

export function VectorLengthSquared(vector: TNumberArray): number {
  let value: number = 0;
  for (let i: number = 0, l: number = vector.length; i < l; i++) {
    value += vector[i] * vector[i];
  }
  return value;
}

export function VectorLength(vector: TNumberArray): number {
  return Math.sqrt(VectorLengthSquared(vector));
}


// https://scicomp.stackexchange.com/questions/27689/numerically-stable-way-of-computing-angles-between-vectors

export function VectorsAngle(
  vectorA: TNumberArray,
  vectorB: TNumberArray,
): number {
  const vectorLengthA: number = VectorLength(vectorA);
  const vectorLengthB: number = VectorLength(vectorB);
  let a: number, b: number, c: number;
  if (vectorLengthA > vectorLengthB) {
    a = vectorLengthA;
    b = vectorLengthB;
    c = VectorDistance(vectorA, vectorB);
  } else {
    b = vectorLengthA;
    a = vectorLengthB;
    c = VectorDistance(vectorB, vectorA);
  }
  const u: number = (b >=  c)
    ? (c - (a - b))
    : (b - (a - c));
  return 2 * Math.atan(
    Math.sqrt(
      (((a - b) + c) * u)
      / ((a + (b + c)) * ((a - c) + b))
    )
  );
}


// export function VectorsAngle(
//   vectorA: TNumberArray,
//   vectorB: TNumberArray,
// ): number {
//   const vectorLength: number = vectorA.length;
//   const vectorLengthA: number = VectorLength(vectorA);
//   const vectorLengthB: number = VectorLength(vectorB);
//   let a: number = 0, b: number = 0;
//   for (let i: number = 0; i < vectorLength; i++) {
//     const an: number = vectorA[i] / vectorLengthA;
//     const bn: number = vectorB[i] / vectorLengthB;
//     const _a: number = an + bn;
//     const _b: number = an - bn;
//     a += _a * _a;
//     b += _b * _b;
//   }
//   return 2 * Math.atan2(Math.sqrt(b), Math.sqrt(a));
// }

// export enum COLLINEARITY {
//   NONE = 0,
//   A = 1,
// }
//
// export function AreCollinear(
//   vectorLength: number,
//   vectorA: TNumberArray,
//   vectorB: TNumberArray,
// ): COLLINEARITY {
//   let fA: number = NaN; // if factor === NaN it is a wildcard (all values accepted)
//   let fB: number;
//   let positive: boolean;
//   let valueA: number;
//   let valueB: number;
//
//   for (let i: number = 0; i < vectorLength; i++) {
//     movesSequence = this.children[i];
//     const valueA = Float.round(movesSequence._buffers['values'][indexA], precision);
//     valueB = Float.round(movesSequence._buffers['values'][indexB], precision);
//     if (Number.isNaN(fA)) {
//       fA = valueA / valueB;
//       positive = valueB > valueA;
//     } else { // fA !== NaN
//       fB = valueA / valueB;
//       if (
//         !Float.isNaN(fB) &&
//         ((fA !== fB) || ((valueB > valueA) !== positive))
//       ) {
//         return false;
//       }
//     }
//   }
//   return true;
//
//   // for (let i: number = 0; i < vectorLength; i++) {
//   //
//   // }
// }

