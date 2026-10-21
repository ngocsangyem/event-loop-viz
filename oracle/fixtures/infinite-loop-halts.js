// Concept: infinite loop halts. A deterministic Budget halts the run.
// @oracle-skip: never terminates in Chrome; budget halting is covered by engine unit tests
console.log('start');
while (true) {}
