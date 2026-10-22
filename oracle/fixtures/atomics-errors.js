// Concept: Atomics argument errors.
// @oracle-isolated
const tryIt = (f) => { try { f(); } catch (e) { console.log(e.name, e.message); } };
tryIt(() => Atomics.add(new Float32Array(new SharedArrayBuffer(8)), 0, 1));
tryIt(() => Atomics.load(new Int32Array(new SharedArrayBuffer(8)), 5));
tryIt(() => Atomics.wait(new Uint8Array(new SharedArrayBuffer(8)), 0, 0));
tryIt(() => SharedArrayBuffer(8));
console.log(Atomics.isLockFree(4), String(Atomics));
