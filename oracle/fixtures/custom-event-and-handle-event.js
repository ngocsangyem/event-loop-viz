// Concept: CustomEvent carries detail; a listener may be an object with handleEvent.
const target = new EventTarget();
target.addEventListener('greet', { handleEvent(e) { console.log('handleEvent', e.detail, e instanceof Event, this !== target); } });
target.addEventListener('greet', function (e) { console.log('function', this === target, e.currentTarget === target, e.eventPhase); });
target.dispatchEvent(new CustomEvent('greet', { detail: 42 }));
