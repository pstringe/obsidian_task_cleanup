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

    this.addCommand({
      id: 'update-overdue-tasks',
      name: 'Update overdue tasks (tomorrow)',
      callback: () => this.updateOverdueTasks(),
    });

    this.addCommand({
      id: 'update-missing-due-dates-today',
      name: 'Update missing due dates to today',
      callback: () => this.updateMissingDueDatesToday(),
    });

    //Command to convert tasks in a directory into notes with frontmatter
    this.addCommand({
      id: 'convert-tasks-to-notes',
      name: 'Convert tasks in directory to notes',
      callback: () => this.convertTasksToNotes(),
    });
  }

  // Command function: Convert tasks in a directory into notes with frontmatter
  async convertTasksToNotes() {
    const files = this.app.vault.getMarkdownFiles();
    console.log({files});
    for (let file of files) {
      console.log({file});
      await this.convertTasksToNotesInFile(file);
    }

    new Notice(
      files.length > 0
        ? 'Tasks converted to notes!'
        : 'No tasks found to convert.'
    );
  }

  async convertTasksToNotesInFile(file: TFile) {
    const tasks = await this.extractTasksFromNotes(file);
    console.log({tasks});
    if (tasks.length === 0) return;
    for (let task of tasks) {
      console.log({tasks});
      const link = this.createNoteFromTask(file, task);
      console.log({link});
      this.replaceTaskWithLink(file, task, link);

    }
  }

  // Extract tasks from notes, return array
  async extractTasksFromNotes(file: TFile) {
    let tasks: string[] = [];
    const taskRegex = /^- \[ \] .+/gm;
    console.log("extract", {file});
    await this.app.vault.process(file, (data) => {
      console.log({data});
      const match = data.match(taskRegex) ?? [];
      console.log({match});
      console.log("before: ", {tasks})
      tasks = [...tasks, ...match];
      console.log("after", {tasks});
      return data;
    })
    return tasks;
  }

  generateObsidianUrlFromDirAndTitle(dir: string, title: string) {
    return `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(dir + "/" + title)}.md`;
  
  }
  // Create note from task, return link to note as string
  createNoteFromTask(file: TFile, task: string) {
    const noteTitle = task.slice(6).trim();
    const directory = file.path.slice(0, -3);
    if (!this.app.vault.getAbstractFileByPath(directory)) {
      this.app.vault.createFolder(directory);
    }
    const notePath = `${directory}/${noteTitle}.md`;
    const url = this.generateObsidianUrlFromDirAndTitle(directory, noteTitle);
    const noteContent = `---
    title: ${noteTitle}
    ---   `;
    this.app.vault.create(notePath, noteContent);
    return `[${noteTitle}](${url})`;
  }

  //replace task in file with link to note
  replaceTaskWithLink(file: TFile, task: string, link: string) {
    this.app.vault.process(file, (content) => {
      console.log('replace', {file});
      return content.replace(task, link);
    });
  }

  // Command function: Update missing due dates to today.
  async updateMissingDueDatesToday() {
    const files = this.app.vault.getMarkdownFiles();
    // Regex to match tasks (lines starting with "- [ ]") that do not contain the "📅" marker.
    const taskWithoutDateRegex = /^(- \[ \] .+)(?!.*📅)/gm;
    let changesMade = false;

    for (const file of files) {
      let content = await this.app.vault.read(file);
      let hasChange = false;

      // Replace each matched task by appending a date set to today.
      const updatedContent = content.replace(taskWithoutDateRegex, (match, taskText) => {
        const today = new Date().toISOString().slice(0, 10);
        hasChange = true;
        return `${taskText} 📅 ${today}`;
      });

      if (hasChange) {
        await this.app.vault.modify(file, updatedContent);
        console.log(`Added missing due dates in ${file.path}`);
        changesMade = true;
      }
    }

    new Notice(
      changesMade
        ? 'Missing due dates added (today)!'
        : 'No tasks without due dates found.'
    );
  }

  // Command function: Update overdue tasks to tomorrow.
  async updateOverdueTasks() {
    const files = this.app.vault.getMarkdownFiles();
    // Regex to match tasks with due dates that are overdue.
    const overdueTaskRegex = /📅\s(\d{4}-\d{2}-\d{2})/g
    let changesMade = false;

    for (const file of files) {
      let content = await this.app.vault.read(file);
      let hasChange = false;

      // Replace each overdue task by setting the due date to tomorrow.
      const updatedContent = content.replace(overdueTaskRegex, (match, dateStr) => {
        const dueDate = new Date(dateStr);
        const today = new Date();
        if (isNaN(dueDate.getTime()) || dueDate >= today) return match;
        today.setDate(today.getDate() + 1);
        const newDateStr = today.toISOString().slice(0, 10);
        hasChange = true;
        return `📅 ${newDateStr}`;
      });

      if (hasChange) {
        await this.app.vault.modify(file, updatedContent);
        console.log(`Updated overdue tasks in ${file.path}`);
        changesMade = true;
      }
    } 

    new Notice(
      changesMade
        ? 'Overdue tasks updated to tomorrow!'
        : 'No overdue tasks found.'
    );
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
