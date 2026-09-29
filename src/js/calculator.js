const DEFAULT_EXPRESSION_TEXT = '0';
const DEFAULT_RESULT_TEXT = '等待输入';
const REQUESTING_TEXT = '正在等待后端…';

export class CalculatorController {
  constructor({api, elements}) {
    this.api = api;
    this.elements = elements;
    this.expression = '';
  }

  initialize() {
    this.elements.keypad.addEventListener('click', (event) => {
      this.handleKeypadClick(event);
    });
    this.renderExpression();
  }

  handleKeypadClick(event) {
    const button = event.target.closest('button');

    if (!button || !this.elements.keypad.contains(button)) {
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
      this.requestCalculation();
    }
  }

  appendToExpression(value) {
    this.expression += value;
    this.renderExpression();
  }

  clear() {
    this.expression = '';
    this.elements.result.textContent = DEFAULT_RESULT_TEXT;
    delete this.elements.result.dataset.status;
    this.renderExpression();
  }

  async requestCalculation() {
    if (!this.expression) {
      return;
    }

    const requestedExpression = this.expression;
    this.setRequestState(true);

    try {
      const response = await this.api.calculate(requestedExpression);
      const result = response.result;

      if (result === undefined || result === null) {
        throw new Error('后端响应中缺少 result 字段');
      }

      this.elements.result.textContent = String(result);
      delete this.elements.result.dataset.status;
      this.addHistoryItem(requestedExpression, result);
    } catch (error) {
      this.elements.result.textContent = error.message || '无法连接到计算服务';
      this.elements.result.dataset.status = 'error';
    } finally {
      this.setRequestState(false);
    }
  }

  renderExpression() {
    this.elements.expression.textContent =
      this.expression || DEFAULT_EXPRESSION_TEXT;
  }

  setRequestState(isRequesting) {
    this.elements.calculateButton.disabled = isRequesting;

    if (isRequesting) {
      this.elements.result.textContent = REQUESTING_TEXT;
      delete this.elements.result.dataset.status;
    }
  }

  addHistoryItem(expression, result) {
    this.elements.historyEmpty?.remove();

    const item = document.createElement('li');
    const expressionText = document.createElement('span');
    const resultText = document.createElement('strong');

    item.className = 'history__item';
    expressionText.className = 'history__expression';
    resultText.className = 'history__result';
    expressionText.textContent = expression;
    resultText.textContent = `= ${String(result)}`;
    item.append(expressionText, resultText);
    this.elements.historyList.prepend(item);
  }
}
