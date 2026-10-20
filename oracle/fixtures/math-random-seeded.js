// Concept: math random seeded. Source: ADR-0002 (Math.random is seeded per Run; excluded from differential tests).
// @oracle-skip: uses Math.random (ADR-0002 excludes it from differential tests)
console.log(Math.random() < 2);
