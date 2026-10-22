// Concept: a static import evaluates the dependency before the module that imports it.
// @oracle-module
import value from 'data:text/javascript,console.log("dependency"); export default 7';
console.log('main', value);
