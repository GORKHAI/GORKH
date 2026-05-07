export function runInThisContext(): never {
  throw new Error('vm.runInThisContext is unavailable in the GORKH desktop webview.');
}

export default {
  runInThisContext,
};
