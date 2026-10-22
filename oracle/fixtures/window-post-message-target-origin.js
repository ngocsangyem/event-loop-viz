// Concept: a target origin that does not match about:blank drops the message; '*' and '/' deliver.
addEventListener('message', (e) => console.log('got', e.data));
postMessage('to example.com', 'https://example.com');
postMessage('to slash', '/');
postMessage('to star', '*');
postMessage('no origin');
try { postMessage(1, 'not a url'); } catch (e) { console.log(e.name); }
