// Concept: error listeners on window run right after the report, with no checkpoint between them.
addEventListener('error', (e) => { console.log('E1', e.message, e.error.message); Promise.resolve().then(() => console.log('E1 micro')); });
addEventListener('error', () => console.log('E2'));
setTimeout(() => { throw new Error('boom'); }, 0);
setTimeout(() => console.log('next timer'), 0);
