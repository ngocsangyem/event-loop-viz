// Concept: a transferred MessagePort arrives as a new port, still entangled with its old peer.
const a = new MessageChannel();
const b = new MessageChannel();
a.port1.onmessage = (e) => {
  const port = e.ports[0];
  console.log('received', e.data, e.ports.length, port === b.port2, port instanceof MessagePort);
  port.onmessage = (event) => console.log('via transferred port', event.data);
};
a.port2.postMessage('hello', [b.port2]);
b.port1.postMessage('ping');
