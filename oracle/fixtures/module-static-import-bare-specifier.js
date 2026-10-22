// Concept: a bare specifier in a static import is reported and the module never runs.
// @oracle-module
import thing from 'lodash';
console.log('never', thing);
