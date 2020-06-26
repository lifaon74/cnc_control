
export function Log(text: string, color: string) {
  console.log(`%c${ text }`, `color: ${ color };`);
}

console.info = (...args: any[]) => {
  args.forEach((value: any) => {
    Log(`ℹ️ ${ value }`, 'blue');
  });
}
