export class CalculatorController {
  constructor({api, historyController, keypad, ui}) {
    this.api = api;
    this.historyController = historyController;
    this.keypad = keypad;
    this.ui = ui;
    this.expression = '';
    this.isInitialized = false;
    this.isRequesting = false;
  }

  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.keypad.addEventListener('click', (event) => {
      this.handleKeypadClick(event);
    });
    this.ui.showExpression(this.expression);
  }

  handleKeypadClick(event) {
    const button = event.target.closest('button');

    if (!button || !this.keypad.contains(button)) {
      return;
    }

    if (button.dataset.value !== undefined) {
      this.appendToExpression(button.dataset.value);
      return;
    }

    if (button.dataset.action === 'clear') {
      this.clear();
      return;
    }

    if (button.dataset.action === 'calculate') {
      void this.requestCalculation();
    }
  }

  appendToExpression(value) {
    this.expression += value;
    this.ui.showExpression(this.expression);
  }

  clear() {
    this.expression = '';
    this.ui.showExpression(this.expression);
    this.ui.resetResult();
  }

  async requestCalculation() {
    if (!this.expression || this.isRequesting) {
      return;
    }

    const requestedExpression = this.expression;
    this.isRequesting = true;
    this.ui.setCalculationLoading(true);

    try {
      const response = await this.api.calculate(requestedExpression);

      if (response.result === undefined || response.result === null) {
        throw new Error('The server response is missing a result');
      }

      this.ui.showResult(response.result);
      void this.historyController.refresh();
    } catch (error) {
      this.ui.showResultError(error.message || 'Calculation failed');
    } finally {
      this.isRequesting = false;
      this.ui.setCalculationLoading(false);
    }
  }
}
