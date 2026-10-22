// Concept: posting a SharedArrayBuffer shares its memory: a new object over the same bytes.
// @oracle-isolated
const shared = new SharedArrayBuffer(4);
const view = new Int32Array(shared);
addEventListener('message', (e) => {
  console.log(e.data === shared, e.data instanceof SharedArrayBuffer, new Int32Array(e.data)[0]);
  view[0] = 9;
  console.log(new Int32Array(e.data)[0]);
});
view[0] = 1;
postMessage(shared, '*');
console.log(shared.byteLength, String(shared), shared instanceof ArrayBuffer, shared.slice(1).byteLength);
