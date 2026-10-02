export class HistoryController {
  constructor({api, ui}) {
    this.api = api;
    this.ui = ui;
    this.initializationPromise = null;
    this.loadVersion = 0;
  }

  initialize() {
    if (this.initializationPromise === null) {
      this.initializationPromise = this.loadHistory();
    }

    return this.initializationPromise;
  }

  async refresh() {
    await this.loadHistory();
  }

  async loadHistory() {
    const currentVersion = this.loadVersion + 1;
    this.loadVersion = currentVersion;
    this.ui.showHistoryLoading();

    try {
      const records = await this.api.getHistory();

      if (currentVersion !== this.loadVersion) {
        return;
      }

      this.ui.renderHistory(records, (id) => this.deleteHistory(id));
    } catch (error) {
      if (currentVersion !== this.loadVersion) {
        return;
      }

      this.ui.showHistoryError(error.message || 'Unable to load history');
    }
  }

  async deleteHistory(id) {
    try {
      await this.api.deleteHistory(id);
      await this.refresh();
    } catch (error) {
      this.ui.showHistoryError(error.message || 'Unable to delete history');
    }
  }
}
