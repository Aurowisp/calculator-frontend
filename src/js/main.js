import {api} from './api.js';
import {CalculatorController} from './calculator.js';

const elements = {
  expression: document.querySelector('#expression-display'),
  result: document.querySelector('#result-display'),
  keypad: document.querySelector('.keypad'),
  calculateButton: document.querySelector('[data-action="calculate"]'),
  historyList: document.querySelector('#history-list'),
  historyEmpty: document.querySelector('#history-empty'),
};

const calculator = new CalculatorController({api, elements});
calculator.initialize();
