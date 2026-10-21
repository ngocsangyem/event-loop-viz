// Concept: math random seeded. Math.random is seeded per Run and excluded from differential tests.
// @oracle-skip: uses Math.random, which differential tests exclude
console.log(Math.random() < 2);
