// Concept: onmessage is a listener at the place it was first set, between addEventListener calls.
addEventListener('message', () => console.log('L1'));
onmessage = () => console.log('onmessage');
addEventListener('message', () => console.log('L2'));
postMessage(0, '*');
