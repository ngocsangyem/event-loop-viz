// Concept: two collected cells: the most recent first, all callbacks before any microtask, throws reported.
const registry = new FinalizationRegistry((held) => {
  console.log('cleanup', held);
  Promise.resolve().then(() => console.log('micro', held));
  if (held === 'b') throw new Error('cleanup failed');
});
(function () { registry.register({}, 'a'); registry.register({}, 'b'); })();
setTimeout(() => gc(), 0);
