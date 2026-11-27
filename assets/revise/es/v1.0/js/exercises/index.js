// index.js — registre des types d'exercices (type → module avec mount(container, item, ctx))
import * as flashcard from './flashcard.js';
import * as mcq from './mcq.js';
import * as match from './match.js';
import * as grid from './grid.js';
import * as order from './order.js';
import * as input from './input.js';
import * as guided from './guided.js';

export const EXERCISES = { flashcard, mcq, match, grid, order, input, guided };
