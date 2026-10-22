// Concept: an unregistered cell never gets a cleanup callback.
const registry = new FinalizationRegistry((held) => console.log('cleanup', held));
const token = {};
(function () { registry.register({}, 'kept', token); registry.register({}, 'collected'); })();
console.log('unregistered', registry.unregister(token));
setTimeout(() => gc(), 0);
