// Concept: postMessage sends a structured clone: later mutation is invisible, functions throw DataCloneError.
const original = { n: 1, nested: { m: 2 }, date: new Date(0), map: new Map([['k', 'v']]), set: new Set([1]), list: [1, , 3] };
original.self = original;
addEventListener('message', (e) => {
  const d = e.data;
  console.log(d === original, d.n, d.nested.m, d.date instanceof Date, d.map.get('k'), d.set.has(1), d.list.length, 1 in d.list, d.self === d);
});
postMessage(original, '*');
original.n = 9;
original.nested.m = 9;
try { postMessage({ f() {} }, '*'); } catch (e) { console.log(e.name, e instanceof DOMException, e.code); }
try { postMessage(Symbol('s'), '*'); } catch (e) { console.log(e.name); }
