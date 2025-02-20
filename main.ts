import { Plugin, TFile, Notice } from 'obsidian';

export default class UpdateTaskDueDatesPlugin extends Plugin {
  async onload() {
    console.log("Update Task Due Dates plugin loaded.");

    // Command to update existing due dates by adding one year.
    this.addCommand({
      id: 'update-existing-due-dates',
      name: 'Update existing due dates to one year later',
      callback: () => this.updateExistingDueDates(),
    });

    // Command to add missing due dates (set to one month from today).
    this.addCommand({
      id: 'add-missing-due-dates',
      name: 'Add missing due dates (one month from today)',
      callback: () => this.addMissingDueDates(),
    });
  }

  // Command function: Update dates that are already present.
  async updateExistingDueDates() {
    const files = this.app.vault.getMarkdownFiles();
    // Regex to match a date in the format "📅 2023-08-09" (with exactly one space after the emoji).
    const dueDateRegex = /📅\s(\d{4}-\d{2}-\d{2})/g;
    let changesMade = false;

    for (const file of files) {
      let content = await this.app.vault.read(file);
      let hasChange = false;

      // Replace each found date with a new date one year later.
      const updatedContent = content.replace(dueDateRegex, (match, dateStr) => {
        const oldDate = new Date(dateStr);
        if (isNaN(oldDate.getTime())) return match;
        oldDate.setFullYear(oldDate.getFullYear() + 1);
        const newDateStr = oldDate.toISOString().slice(0, 10);
        hasChange = true;
        return `📅 ${newDateStr}`;
      });

      if (hasChange) {
        await this.app.vault.modify(file, updatedContent);
        console.log(`Updated due dates in ${file.path}`);
        changesMade = true;
      }
    }

    new Notice(
      changesMade
        ? 'Existing due dates updated to one year later!'
        : 'No due dates found to update.'
    );
  }

  // Command function: Add a missing due date to tasks.
  async addMissingDueDates() {
    const files = this.app.vault.getMarkdownFiles();
    // Regex to match tasks (lines starting with "- [ ]") that do not contain the "📅" marker.
    const taskWithoutDateRegex = /^(- \[ \] .+)(?!.*📅)/gm;
    let changesMade = false;

    for (const file of files) {
      let content = await this.app.vault.read(file);
      let hasChange = false;

      // Replace each matched task by appending a date set to one month from today.
      const updatedContent = content.replace(taskWithoutDateRegex, (match, taskText) => {
        let newDate = new Date();
        newDate.setMonth(newDate.getMonth() + 1);
        const newDateStr = newDate.toISOString().slice(0,10);
        hasChange = true;
        return `${taskText} 📅 ${newDateStr}`;
      });

      if (hasChange) {
        await this.app.vault.modify(file, updatedContent);
        console.log(`Added missing due dates in ${file.path}`);
        changesMade = true;
      }
    }

    new Notice(
      changesMade
        ? 'Missing due dates added (one month from today)!'
        : 'No tasks without due dates found.'
    );
  }
}
