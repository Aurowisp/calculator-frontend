import {api} from './api.js';
import {CalculatorController} from './calculator.js';
import {HistoryController} from './history.js';
import {CalculatorUI} from './ui.js';

const elements = {
  expression: document.querySelector('#expression-display'),
  result: document.querySelector('#result-display'),
  keypad: document.querySelector('.keypad'),
  calculateButton: document.querySelector('[data-action="calculate"]'),
  historyList: document.querySelector('#history-list'),
};

const ui = new CalculatorUI(elements);
const historyController = new HistoryController({api, ui});
const calculatorController = new CalculatorController({
  api,
  historyController,
  keypad: elements.keypad,
  ui,
});

let isInitialized = false;

function initializeApp() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  calculatorController.initialize();
  void historyController.initialize();
}

function startApp() {
  initializeApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, {once: true});
} else {
  startApp();
}
