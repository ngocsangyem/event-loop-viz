// Concept: an object captured by a pending timer callback is reachable, so gc() keeps it.
let ref;
(function () {
  const target = {};
  ref = new WeakRef(target);
  setTimeout(() => target, 50);
})();
setTimeout(() => { gc(); console.log('while the timer holds it', ref.deref() !== undefined); }, 0);
setTimeout(() => { gc(); console.log('after the timer ran', ref.deref() !== undefined); }, 100);
