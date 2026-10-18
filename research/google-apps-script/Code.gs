function setupBricksDemandValidation() {
  const existing = getExistingSetup_();
  if (existing) {
    logSetupUrls_(existing.form, existing.spreadsheet);
    return existing;
  }

  const spreadsheet = SpreadsheetApp.create(CONFIG.productName + ' Demand Validation');
  const form = FormApp.create('Bricks: Focus and Digital Distraction Study', true);
  buildBricksForm_(form);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  SpreadsheetApp.flush();

  setupScoredLeadsSheet_(spreadsheet);
  setupResearchNotes_(spreadsheet);
  setupDashboard_(spreadsheet);
  removeUnusedDefaultSheet_(spreadsheet);
  installFormSubmitTrigger_(spreadsheet);

  PropertiesService.getScriptProperties().setProperties({
    [PROPERTY_KEYS.formId]: form.getId(),
    [PROPERTY_KEYS.spreadsheetId]: spreadsheet.getId()
  });

  logSetupUrls_(form, spreadsheet);
  return {form: form, spreadsheet: spreadsheet};
}

function getBricksSetupStatus() {
  const setup = getExistingSetup_();
  if (!setup) {
    Logger.log('No working Bricks survey setup was found. Run setupBricksDemandValidation().');
    return null;
  }
  logSetupUrls_(setup.form, setup.spreadsheet);
  return setup;
}

function repairFormSubmitTrigger() {
  const setup = getExistingSetup_();
  if (!setup) throw new Error('Run setupBricksDemandValidation() first.');
  installFormSubmitTrigger_(setup.spreadsheet);
  Logger.log('The spreadsheet form-submit trigger is installed.');
}

function getExistingSetup_() {
  const properties = PropertiesService.getScriptProperties();
  const formId = properties.getProperty(PROPERTY_KEYS.formId);
  const spreadsheetId = properties.getProperty(PROPERTY_KEYS.spreadsheetId);
  if (!formId || !spreadsheetId) return null;
  try {
    return {
      form: FormApp.openById(formId),
      spreadsheet: SpreadsheetApp.openById(spreadsheetId)
    };
  } catch (error) {
    Logger.log('Saved setup could not be opened: ' + error.message);
    return null;
  }
}

function installFormSubmitTrigger_(spreadsheet) {
  const exists = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'onBricksFormSubmit' &&
      trigger.getTriggerSourceId() === spreadsheet.getId();
  });
  if (!exists) {
    ScriptApp.newTrigger('onBricksFormSubmit')
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
  }
}

function logSetupUrls_(form, spreadsheet) {
  Logger.log('Form editor: ' + form.getEditUrl());
  Logger.log('Public survey: ' + form.getPublishedUrl());
  Logger.log('Response spreadsheet: ' + spreadsheet.getUrl());
}

function removeUnusedDefaultSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Sheet1');
  if (sheet && sheet.getLastRow() === 0 && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(sheet);
  }
}
