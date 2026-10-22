// Concept: gc() keeps what is still reachable: an object a pending await or a then callback will use, a loaded module's objects; a handled rejected promise can go.
let awaited, captured, rejected;
(async () => {
  const obj = {};
  awaited = new WeakRef(obj);
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log('after await', awaited.deref() === obj);
})();
const pending = new Promise(() => {});
(function () { const big = {}; captured = new WeakRef(big); pending.then(() => big); })();
let p = Promise.reject(1); p.catch(() => {}); rejected = new WeakRef(p); p = null;
import('data:text/javascript,export const o = {}; globalThis.fromModule = new WeakRef(o)');
setTimeout(() => {
  gc();
  console.log('awaited', awaited.deref() !== undefined, 'captured', captured.deref() !== undefined);
  console.log('rejected promise collected', rejected.deref() === undefined, 'module object', fromModule.deref() !== undefined);
}, 5);
