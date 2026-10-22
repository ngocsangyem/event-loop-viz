// Concept: duplicate listeners, once, removal, and listeners added during a dispatch.
const target = new EventTarget();
const f = () => console.log('f');
target.addEventListener('x', f);
target.addEventListener('x', f);
target.addEventListener('x', () => console.log('once'), { once: true });
target.addEventListener('x', () => target.addEventListener('x', () => console.log('added late')), { once: true });
target.dispatchEvent(new Event('x'));
console.log('--');
target.removeEventListener('x', f);
target.dispatchEvent(new Event('x'));
