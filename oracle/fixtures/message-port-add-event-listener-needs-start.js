// Concept: addEventListener('message') on a port waits for start(); listeners run with checkpoints between.
const channel = new MessageChannel();
channel.port1.addEventListener('message', () => { console.log('P1'); Promise.resolve().then(() => console.log('P1 micro')); });
channel.port1.addEventListener('message', () => console.log('P2'));
channel.port2.postMessage(0);
setTimeout(() => { console.log('starting'); channel.port1.start(); }, 10);
