function setupDashboard_(spreadsheet) {
  const old = spreadsheet.getSheetByName(SHEETS.dashboard);
  const sheet = old || spreadsheet.insertSheet(SHEETS.dashboard);
  sheet.clear();
  sheet.getCharts().forEach(function(chart) { sheet.removeChart(chart); });
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(2);
  sheet.getRange('A1:H1').merge().setValue('Bricks demand-validation dashboard')
    .setBackground('#202124').setFontColor('#ffffff').setFontSize(16).setFontWeight('bold');

  const cards = [
    ['Total responses', '=MAX(0,COUNTA(\'' + SHEETS.scored + '\'!A:A)-1)'],
    ['Android respondents', '=COUNTIF(\'' + SHEETS.scored + '\'!G:G,"Android*")'],
    ['Students', '=COUNTIF(\'' + SHEETS.scored + '\'!E:E,"*student*")'],
    ['Freelancers', '=COUNTIF(\'' + SHEETS.scored + '\'!E:E,"Freelancer")'],
    ['Remote employees', '=COUNTIF(\'' + SHEETS.scored + '\'!E:E,"Remote employee")'],
    ['Hot beta leads', '=COUNTIF(\'' + SHEETS.scored + '\'!N:N,"Hot beta lead")'],
    ['Warm leads', '=COUNTIF(\'' + SHEETS.scored + '\'!N:N,"Warm lead")'],
    ['High focus pain', '=COUNTIF(\'' + SHEETS.scored + '\'!O:O,"*High focus-pain*")'],
    ['Movement-positive', '=COUNTIF(\'' + SHEETS.scored + '\'!O:O,"*High movement-interest*")'],
    ['Likely to purchase', '=COUNTIF(\'' + SHEETS.scored + '\'!P:P,"I would buy it")+COUNTIF(\'' + SHEETS.scored + '\'!P:P,"I would probably buy it after testing")'],
    ['Accepts Rs2,499', '=COUNTIF(\'' + SHEETS.scored + '\'!P:P,"I would buy it")'],
    ['Deposit: yes/maybe', '=COUNTIF(\'' + SHEETS.scored + '\'!R:R,"Yes")+COUNTIF(\'' + SHEETS.scored + '\'!R:R,"Maybe")']
  ];
  cards.forEach(function(card, index) {
    const row = 3 + Math.floor(index / 4) * 3;
    const col = 1 + (index % 4) * 2;
    sheet.getRange(row, col, 1, 2).merge().setValue(card[0]).setBackground('#f1f3f4').setFontWeight('bold');
    sheet.getRange(row + 1, col, 1, 2).merge().setFormula(card[1]).setFontSize(18).setFontWeight('bold');
  });

  sheet.getRange('A13:H13').merge().setValue('Top consenting beta leads').setBackground('#e6f4ea').setFontWeight('bold');
  sheet.getRange('A14').setFormula('=QUERY(\'' + SHEETS.scored + '\'!A:U,"select B,C,D,E,M,N,P,T where S=\'Provided\' order by M desc limit 20",1)');

  const responseSheet = getFormResponseSheet_(spreadsheet);
  if (responseSheet) buildDashboardCharts_(sheet, responseSheet);
  sheet.setColumnWidths(1, 8, 120);
}

function rebuildBricksDashboard() {
  const setup = getExistingSetup_();
  if (!setup) throw new Error('Run setupBricksDemandValidation() first.');
  setupDashboard_(setup.spreadsheet);
  Logger.log('Dashboard rebuilt: ' + setup.spreadsheet.getUrl());
}

function buildDashboardCharts_(dashboard, responseSheet) {
  const distributions = [
    {title:'Respondents by role', question:Q.role, options:OPTIONS.roles, type:Charts.ChartType.BAR},
    {title:'Unplanned phone checks in the most recent hour', question:Q.checks, options:OPTIONS.checks, type:Charts.ChartType.COLUMN},
    {title:'Distraction impact', question:Q.impact, options:['1','2','3','4','5'], type:Charts.ChartType.COLUMN},
    {title:'Main anti-distraction method', question:Q.triedMethod, options:OPTIONS.methods, type:Charts.ChartType.BAR},
    {title:'Physical Brick usefulness', question:Q.usefulness, options:['1','2','3','4','5'], type:Charts.ChartType.COLUMN},
    {title:'Realistic Brick placement', question:Q.placement, options:OPTIONS.placements, type:Charts.ChartType.BAR},
    {title:'Useful pause or annoying interruption', question:Q.pause, options:OPTIONS.pause, type:Charts.ChartType.BAR},
    {title:'Price preference', question:Q.price, options:OPTIONS.prices, type:Charts.ChartType.COLUMN},
    {title:'Purchase likelihood', question:Q.purchaseLikelihood, options:['1','2','3','4','5'], type:Charts.ChartType.COLUMN}
  ];
  let helperCol = 27;
  distributions.forEach(function(spec, index) {
    const range = writeDistributionBlock_(dashboard, responseSheet, helperCol, spec.title, spec.question, spec.options);
    const row = 36 + Math.floor(index / 2) * 16;
    const col = index % 2 === 0 ? 1 : 6;
    const chart = dashboard.newChart().setChartType(spec.type).addRange(range)
      .setOption('title', spec.title).setOption('legend', {position:'none'})
      .setOption('colors', ['#4285f4']).setOption('backgroundColor', '#ffffff')
      .setPosition(row, col, 0, 0).build();
    dashboard.insertChart(chart);
    helperCol += 3;
  });
  dashboard.hideColumns(27, helperCol - 27);
}

function writeDistributionBlock_(dashboard, responseSheet, startCol, title, question, options) {
  const headers = responseSheet.getRange(1, 1, 1, responseSheet.getLastColumn()).getDisplayValues()[0];
  const index = headers.indexOf(question);
  dashboard.getRange(1, startCol, 1, 2).setValues([[title, 'Responses']]);
  dashboard.getRange(2, startCol, options.length, 1).setValues(options.map(function(option) { return [option]; }));
  if (index >= 0) {
    const sourceColumn = columnLetter_(index + 1);
    const sourceName = "'" + responseSheet.getName().replace(/'/g, "''") + "'";
    for (let row = 2; row < options.length + 2; row++) {
      dashboard.getRange(row, startCol + 1).setFormula('=COUNTIF(' + sourceName + '!' + sourceColumn + ':' + sourceColumn + ',' + columnLetter_(startCol) + row + ')');
    }
  }
  return dashboard.getRange(1, startCol, options.length + 1, 2);
}

function getFormResponseSheet_(spreadsheet) {
  return spreadsheet.getSheets().find(function(sheet) {
    if ([SHEETS.scored, SHEETS.dashboard, SHEETS.research, 'Sheet1'].indexOf(sheet.getName()) >= 0) return false;
    if (sheet.getLastColumn() < 2) return false;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    return headers.indexOf(Q.role) >= 0;
  }) || null;
}

function columnLetter_(column) {
  let result = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    column = Math.floor((column - 1) / 26);
  }
  return result;
}
