// Concept: a frame that came due while the Script was busy runs before a timer queued at the end of it.
const start = performance.now();
while (performance.now() - start < 30) {}
requestAnimationFrame(() => console.log('raf'));
setTimeout(() => console.log('timeout 0'), 0);
