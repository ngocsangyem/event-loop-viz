// Concept: infinite loop halts. Source: ADR-0004 (deterministic budget halts the run).
// @oracle-skip: never terminates in Chrome; budget halting is covered by engine unit tests (ADR-0004)
console.log('start');
while (true) {}
