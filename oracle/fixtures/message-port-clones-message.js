// Concept: a port message is a structured clone too; closing a port drops what was queued.
const channel = new MessageChannel();
const data = { a: 1 };
channel.port1.onmessage = (e) => console.log('got', e.data.a, e.data === data);
channel.port2.postMessage(data);
data.a = 2;
const closing = new MessageChannel();
closing.port1.onmessage = () => console.log('never');
closing.port2.postMessage(1);
closing.port1.close();
try { channel.port2.postMessage(() => 1); } catch (e) { console.log(e.name, e.message); }
