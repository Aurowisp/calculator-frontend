const DEFAULT_EXPRESSION_TEXT = '0';
const DEFAULT_RESULT_TEXT = '等待输入';

export class CalculatorUI {
  constructor(elements) {
    this.elements = elements;
  }

  showExpression(expression) {
    this.elements.expression.textContent =
      expression || DEFAULT_EXPRESSION_TEXT;
  }

  resetResult() {
    this.elements.result.textContent = DEFAULT_RESULT_TEXT;
    delete this.elements.result.dataset.status;
  }

  showResult(result) {
    this.elements.result.textContent = String(result);
    delete this.elements.result.dataset.status;
  }

  showResultError(message) {
    this.elements.result.textContent = message;
    this.elements.result.dataset.status = 'error';
  }

  setCalculationLoading(isLoading) {
    this.elements.calculateButton.disabled = isLoading;

    if (isLoading) {
      this.elements.result.textContent = '正在等待后端…';
      delete this.elements.result.dataset.status;
    }
  }

  showHistoryLoading() {
    this.renderHistoryMessage('正在加载历史记录…');
  }

  showHistoryError(message) {
    this.renderHistoryMessage(message, true);
  }

  renderHistory(records, onDelete) {
    this.elements.historyList.replaceChildren();

    if (records.length === 0) {
      this.renderHistoryMessage('暂无计算记录');
      return;
    }

    records.forEach((record) => {
      this.elements.historyList.append(
        this.createHistoryItem(record, onDelete),
      );
    });
  }

  renderHistoryMessage(message, isError = false) {
    const item = document.createElement('li');
    item.className = 'history__empty';

    if (isError) {
      item.classList.add('history__empty--error');
    }

    item.textContent = message;
    this.elements.historyList.replaceChildren(item);
  }

  createHistoryItem(record, onDelete) {
    const item = document.createElement('li');
    const expression = document.createElement('span');
    const result = document.createElement('strong');
    const time = document.createElement('time');
    const deleteButton = document.createElement('button');

    item.className = 'history__item';
    expression.className = 'history__expression';
    result.className = 'history__result';
    time.className = 'history__time';
    deleteButton.className = 'history__delete';

    expression.textContent = record.expression;
    result.textContent = `= ${String(record.result)}`;
    time.dateTime = record.created_at;
    time.textContent = formatDateTime(record.created_at);
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.setAttribute('aria-label', `删除表达式 ${record.expression}`);

    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      await onDelete(record.id);
    });

    item.append(expression, result, deleteButton, time);
    return item;
  }
}

function formatDateTime(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '时间未知';
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/u.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN');
}
