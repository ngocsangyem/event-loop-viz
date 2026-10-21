// Concept: throw in script stops script only. The script error is reported; queued work still runs.
setTimeout(() => console.log('timer still runs'), 0);
Promise.resolve().then(() => console.log('microtask still runs'));
console.log('before throw');
throw new Error('script-boom');
