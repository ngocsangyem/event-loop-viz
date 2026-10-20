// Concept: syntax error runs nothing. Source: ADR-0002 (a syntax error stops the run before any trace).
// @oracle-skip: SyntaxError message text is engine-specific (V8 vs engine262); covered by engine unit tests
console.log('never printed');
let = ;
