// Concept: transfer-list errors are DataCloneErrors thrown by postMessage.
const a = new MessageChannel();
const b = new MessageChannel();
const tryPost = (transfer) => { try { a.port2.postMessage(null, transfer); } catch (e) { console.log(e.name, e.message); } };
tryPost([b.port2, b.port2]);
tryPost([a.port2]);
tryPost([{}]);
a.port2.postMessage(null, [b.port2]);
tryPost([b.port2]);
try { a.port2.postMessage(b.port1); } catch (e) { console.log(e.name, e.message); }
