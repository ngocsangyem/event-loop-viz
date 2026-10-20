// Concept: throw in script stops script only. Source: ADR-0002 (script error reported; queued work still runs).
setTimeout(() => console.log('timer still runs'), 0);
Promise.resolve().then(() => console.log('microtask still runs'));
console.log('before throw');
throw new Error('script-boom');
