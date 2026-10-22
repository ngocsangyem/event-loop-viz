// Concept: structured clone of wrapper objects and ArrayBuffers: transfer detaches, a detached buffer cannot be cloned, resizable stays resizable.
const channel = new MessageChannel();
channel.port1.onmessage = (e) => console.log(e.data.map((x) => typeof x + ':' + x.valueOf()).join(' '));
channel.port2.postMessage([new Boolean(true), new String('a'), Object(1n), new Number(2)]);
const unreferenced = new ArrayBuffer(8);
postMessage(1, '*', [unreferenced]);
console.log('transferred length', unreferenced.byteLength);
try { postMessage(unreferenced, '*'); } catch (e) { console.log(e.name, e.message); }
addEventListener('message', (e) => { if (e.data instanceof ArrayBuffer) console.log(e.data.resizable, e.data.maxByteLength); });
postMessage(new ArrayBuffer(4, { maxByteLength: 8 }), '*');
