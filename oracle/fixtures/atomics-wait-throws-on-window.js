// Concept: the window cannot block, so Atomics.wait throws; the other Atomics work on shared memory.
// @oracle-isolated
const shared = new Int32Array(new SharedArrayBuffer(16));
console.log(typeof SharedArrayBuffer, crossOriginIsolated, Atomics.add(shared, 0, 5), Atomics.load(shared, 0));
try { Atomics.wait(shared, 0, 5, 10); } catch (e) { console.log(e.name, e.message); }
try { Atomics.wait(new Int32Array(4), 0, 0); } catch (e) { console.log(e.name, e.message); }
console.log(Atomics.compareExchange(shared, 0, 5, 7), Atomics.exchange(shared, 0, 3), Atomics.load(shared, 0), Atomics.notify(shared, 0));
