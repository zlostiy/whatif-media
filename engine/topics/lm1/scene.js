// "Что если ты — последний мужчина на Земле", часть 1
import { start } from '../../core.js';
import { makeRender, full, fx, BUB } from '../_lastman.js';
start({ render: makeRender(1), full, fx, mins: { radio: 7.5, dawn: 6.5, end: 3.5 }, bubbles: BUB });
