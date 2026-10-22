// Concept: the fetch response task is queued at the call; a later 0 ms timer runs after it.
fetch('data:,hello').then(() => console.log('fetch resolved'));
setTimeout(() => console.log('timeout 0'), 0);
Promise.resolve().then(() => console.log('microtask'));
