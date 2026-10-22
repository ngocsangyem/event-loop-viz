// Concept: unhandledrejection listeners run in the notification task, a checkpoint after each.
addEventListener('unhandledrejection', (e) => { console.log('first', e.reason.message); Promise.resolve().then(() => console.log('first micro')); });
addEventListener('unhandledrejection', () => console.log('second'));
Promise.reject(new Error('nobody caught this'));
