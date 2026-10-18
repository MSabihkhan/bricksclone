function setupResearchNotes_(spreadsheet) {
  const old = spreadsheet.getSheetByName(SHEETS.research);
  const sheet = old || spreadsheet.insertSheet(SHEETS.research);
  sheet.clear();
  const rows = [
    ['Topic', 'Careful finding', 'Allowed wording', 'Prohibited wording', 'Source', 'Product implication'],
    ['Attention residue', 'Attention can remain partly attached to a previous task after switching.', 'Switching between tasks can make it harder to fully focus on the next task.', 'Every interruption costs exactly 23 minutes.', 'https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html', 'Test whether added friction reduces unplanned switching.'],
    ['Media multitasking', 'Heavier media multitasking has been associated with weaker sustained attention.', 'Frequent media multitasking has been associated with greater difficulty sustaining attention.', 'Phones permanently destroy attention.', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7614709/', 'Treat correlation as context, not proof of causation.'],
    ['Task switching', 'Switching can leave attention on the prior task.', 'Task switching may make re-engagement harder.', 'Bricks eliminates attention residue.', 'https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html', 'Ask for perceived re-engagement time without presenting it as measured.'],
    ['Sedentary behaviour', 'WHO defines sedentary behaviour as low-energy waking activity such as sitting or reclining.', 'Long periods of sitting are worth understanding.', 'Sitting respondents have a health condition.', 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', 'Keep movement interest separate from medical or sales qualification.'],
    ['Movement breaks', 'Regular movement is generally beneficial; the survey tests preference for a brief pause.', 'A short walk may create an intentional pause.', 'Walking to Bricks prevents disease or counts as sufficient exercise.', 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', 'Measure whether the walk feels useful or annoying.'],
    ['Dr. Sahar Yousef attribution', 'Public work discusses focus and cognitive performance.', 'Use verified primary-source statements only.', 'Dr. Yousef endorses Bricks.', 'https://haas.berkeley.edu/', 'Do not use a person as implied product endorsement.'],
    ['Medical-claim limitations', 'Bricks is a productivity concept, not a medical device.', 'Bricks creates intentional friction.', 'Bricks treats ADHD, addiction, anxiety, or repairs attention.', 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', 'Keep product and health claims narrow and testable.']
  ];
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(1, 1, 1, rows[0].length).setBackground('#202124').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, rows.length, rows[0].length).createFilter();
  sheet.setColumnWidths(1, rows[0].length, 210);
  sheet.setColumnWidth(5, 300);
}
