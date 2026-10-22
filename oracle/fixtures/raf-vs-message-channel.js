// Concept: a posted port message is a ready task, so it runs before the next rendering opportunity.
const channel = new MessageChannel();
channel.port1.onmessage = () => console.log('message');
requestAnimationFrame(() => console.log('raf'));
channel.port2.postMessage(null);
