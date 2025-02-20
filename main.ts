import { Plugin, TFile, Notice } from 'obsidian';

export default class UpdateTaskDueDatesPlugin extends Plugin {
  async onload() {
    // Register a command so you can run the update via the Command Palette.
    this.addCommand({
      id: 'update-task-due-dates',
      name: 'Update Task Due Dates to One Year Later',
      callback: () => this.updateDueDates(),
    });
  }

  async updateDueDates() {
    // Get all markdown files in the vault.
    const files = this.app.vault.getMarkdownFiles();
    console.log(`Found ${files.length} markdown files`);

    // Regex to match a due date in the format "due: YYYY-MM-DD".
    /*
         📅 2023-08-09 
        const dueDateRegex = /📅\s*(\d{4}-\d{2}-\d{2})/g;
        console.log('Updating due dates...');
    
    */
    const dueDateRegex = /📅\s{2,}(\d{4}-\d{2}-\d{2})/g;
    console.log('Updating due dates...');

    // Loop through each file.
    for (const file of files) {
      let content = await this.app.vault.read(file);
      console.log(`Checking due dates in ${file.path}`);
      let hasChange = false;

      // Replace each found due date with a new date, one year later.
      const updatedContent = content.replace(dueDateRegex, (match, dateStr) => {
        const oldDate = new Date(dateStr);
        console.log(`Found due date: ${dateStr}`);
        if (isNaN(oldDate.getTime())) {
          // If the date is invalid, do not modify it.
          return match;
        }
        // Add one year to the date.
        oldDate.setFullYear(/*oldDate.getFullYear() + 1*/2025);

        // Format the new date as YYYY-MM-DD.
        const newDateStr = oldDate.toISOString().slice(0, 10);
        hasChange = true;
        return `📅 ${newDateStr}`;
      });

      // If any changes were made, write the updated content back to the file.
      if (hasChange) {
        await this.app.vault.modify(file, updatedContent);
        console.log(`Updated due dates in ${file.path}`);
      }
    }
    console.log('Due dates updated!');
    // Give the user a notification once the process is complete.
    new Notice('Due dates updated to one year from now!');
  }
}
