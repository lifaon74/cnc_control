export function GetTime(): number {
  const time: [number, number] = process.hrtime();
  return time[0] + time[1] * 1e-9;
}
