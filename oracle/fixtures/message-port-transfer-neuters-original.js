// Concept: after a transfer the original port object is neutered: it neither receives nor sends.
const a = new MessageChannel();
const b = new MessageChannel();
a.port1.onmessage = () => console.log('transfer delivered');
a.port2.postMessage(null, [b.port2]);
b.port2.onmessage = () => console.log('never');
b.port1.postMessage('x');
b.port2.postMessage('from the old object');
b.port1.onmessage = () => console.log('never either');
setTimeout(() => console.log('done'), 10);
