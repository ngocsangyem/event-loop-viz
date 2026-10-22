// Concept: preventDefault makes dispatchEvent return false; stopImmediatePropagation skips later listeners.
const target = new EventTarget();
target.addEventListener('x', (e) => { e.preventDefault(); e.stopImmediatePropagation(); console.log('first', e.defaultPrevented); });
target.addEventListener('x', () => console.log('never'));
console.log(target.dispatchEvent(new Event('x', { cancelable: true })));
console.log(target.dispatchEvent(new CustomEvent('y', { detail: 1 })));
