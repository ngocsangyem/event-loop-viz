// Concept: sync code, a promise reaction, an async function's await and a 0 ms timer in one Script.
console.log('start');
setTimeout(() => console.log('timeout 1'), 0);
Promise.resolve().then(() => console.log('promise 1'));
(async () => {
    console.log('async that');
    await null;
    console.log('async end');
})();
console.log('end');
