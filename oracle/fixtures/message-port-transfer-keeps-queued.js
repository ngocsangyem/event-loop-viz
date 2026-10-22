// Concept: messages queued at a port before its transfer arrive once the new port starts.
const a = new MessageChannel();
const b = new MessageChannel();
b.port1.postMessage('sent before transfer');
a.port1.onmessage = (e) => { e.ports[0].onmessage = (event) => console.log('new port got', event.data); };
a.port2.postMessage(null, [b.port2]);
setTimeout(() => console.log('timeout 0'), 0);
