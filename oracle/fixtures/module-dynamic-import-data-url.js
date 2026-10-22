// Concept: import() loads in a task queued at the call; the module evaluates there, then the promise resolves.
import('data:text/javascript,console.log("module evaluated"); export default 42').then((m) => console.log('imported', m.default));
Promise.resolve().then(() => console.log('m1')).then(() => console.log('m2')).then(() => console.log('m3'));
setTimeout(() => console.log('timeout 0'));
