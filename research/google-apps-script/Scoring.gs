function setupScoredLeadsSheet_(spreadsheet) {
  const old = spreadsheet.getSheetByName(SHEETS.scored);
  const sheet = old || spreadsheet.insertSheet(SHEETS.scored);
  sheet.clear();
  sheet.getRange(1, 1, 1, SCORED_LEAD_HEADERS.length).setValues([SCORED_LEAD_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SCORED_LEAD_HEADERS.length)
    .setBackground('#202124').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), SCORED_LEAD_HEADERS.length)
    .createFilter();
  sheet.getRange(2, 8, sheet.getMaxRows() - 1, 6).setNumberFormat('0');
  sheet.setColumnWidths(1, SCORED_LEAD_HEADERS.length, 130);
  sheet.setColumnWidth(15, 260);
  sheet.setColumnWidth(21, 260);

  const primaryRange = sheet.getRange(2, 14, sheet.getMaxRows() - 1, 1);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Hot beta lead').setBackground('#b7e1cd').setRanges([primaryRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Warm lead').setBackground('#fce8b2').setRanges([primaryRange]).build()
  ];
  const consentRange = sheet.getRange(2, 19, sheet.getMaxRows() - 1, 1);
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Missing').setBackground('#f4c7c3').setRanges([consentRange]).build());
  sheet.setConditionalFormatRules(rules);
}

function onBricksFormSubmit(e) {
  if (!e || !e.namedValues) throw new Error('This function must run from the spreadsheet form-submit trigger.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const response = normalizeNamedValues_(e.namedValues);
    const result = scoreResponse_(response);
    const spreadsheet = e.source || SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.spreadsheetId));
    const sheet = spreadsheet.getSheetByName(SHEETS.scored);
    const timestamp = e.values && e.values[0] ? e.values[0] : new Date();
    sheet.appendRow([
      timestamp, answer_(response, Q.name), answer_(response, Q.email), answer_(response, Q.whatsapp),
      answer_(response, Q.role), '', answer_(response, Q.phone), result.focusPain,
      result.productFit, result.movementOpportunity, result.commercialIntent,
      result.betaReadiness, result.total, result.primarySegment, result.tags.join(', '),
      answer_(response, Q.founderPrice), answer_(response, Q.price), answer_(response, Q.deposit),
      result.hasConsent ? 'Provided' : (answer_(response, Q.beta) === 'Yes' ? 'Missing' : 'Not requested'),
      '', ''
    ]);
  } catch (error) {
    console.error('Bricks scoring failed: ' + error.message);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function scoreResponse_(response) {
  const a = function(title) { return answer_(response, title); };
  let focusPain = 0;
  if (a(Q.checks) === '6–10 times') focusPain += 8;
  if (a(Q.checks) === 'More than 10 times') focusPain += 12;
  if (a(Q.overrun) === 'Yes, once') focusPain += 4;
  if (a(Q.overrun) === 'Yes, more than once') focusPain += 8;
  if (a(Q.returnTime) === '5–15 minutes') focusPain += 4;
  if (a(Q.returnTime) === 'More than 15 minutes') focusPain += 7;
  if (a(Q.returnTime) === 'I did not return to the task') focusPain += 9;
  if (Number(a(Q.impact)) === 4) focusPain += 6;
  if (Number(a(Q.impact)) === 5) focusPain += 10;
  focusPain = Math.min(30, focusPain);

  let productFit = 0;
  if (a(Q.phone) === 'Android with NFC') productFit += 8;
  if (a(Q.phone) === 'Android — not sure about NFC') productFit += 4;
  const bypassed = ['I disable the blocker', 'I use an emergency bypass', 'I switch to another device'].indexOf(a(Q.bypass)) >= 0;
  if (a(Q.triedMethod) === 'An app blocker' && bypassed) productFit += 7;
  if (Number(a(Q.usefulness)) === 4) productFit += 5;
  if (Number(a(Q.usefulness)) === 5) productFit += 8;
  if (a(Q.distance) === 'I would unlock less often') productFit += 5;
  productFit = Math.min(25, productFit);

  let movementOpportunity = 0;
  if (a(Q.pause) === 'Mostly useful') movementOpportunity += 5;
  if (a(Q.pause) === 'Useful pause') movementOpportunity += 7;
  if (['Across the room', 'Near the door', 'In another room'].indexOf(a(Q.placement)) >= 0) movementOpportunity += 3;
  movementOpportunity = Math.min(10, movementOpportunity);

  let commercialIntent = 0;
  if (Number(a(Q.purchaseLikelihood)) === 4) commercialIntent += 8;
  if (Number(a(Q.purchaseLikelihood)) === 5) commercialIntent += 14;
  if (['Rs2,500–2,999', 'Rs3,000–3,499', 'Rs3,500 or more'].indexOf(a(Q.price)) >= 0) commercialIntent += 7;
  if (a(Q.founderPrice) === 'I would buy it') commercialIntent += 10;
  if (a(Q.founderPrice) === 'I would probably buy it after testing') commercialIntent += 6;
  if (a(Q.deposit) === 'Yes') commercialIntent += 8;
  if (a(Q.deposit) === 'Maybe') commercialIntent += 4;
  commercialIntent = Math.min(30, commercialIntent);

  const contact = answer_(response, Q.email) || answer_(response, Q.whatsapp);
  const hasConsent = answer_(response, Q.consent).indexOf('I agree') === 0;
  const betaReadiness = a(Q.beta) === 'Yes' && contact && hasConsent ? 5 : 0;
  const total = focusPain + productFit + movementOpportunity + commercialIntent + betaReadiness;
  const segmentation = segmentResponse_(response, {focusPain, productFit, movementOpportunity, commercialIntent, betaReadiness, total}, hasConsent);
  return {focusPain, productFit, movementOpportunity, commercialIntent, betaReadiness, total, hasConsent, primarySegment: segmentation.primary, tags: segmentation.tags};
}

function segmentResponse_(response, scores, hasConsent) {
  const role = answer_(response, Q.role);
  const phone = answer_(response, Q.phone);
  const tags = [];
  if (role.indexOf('student') >= 0) tags.push('Student focus');
  if (role === 'Freelancer') tags.push('Freelancer focus');
  if (role === 'Remote employee') tags.push('Remote-work focus');
  if (answer_(response, Q.work) === 'Exam preparation') tags.push('Exam-preparation focus');
  if (scores.focusPain >= 22) tags.push('High focus-pain', 'High distraction');
  if (answer_(response, Q.triedMethod) === 'An app blocker' && ['I disable the blocker', 'I use an emergency bypass', 'I switch to another device'].indexOf(answer_(response, Q.bypass)) >= 0) tags.push('Existing-blocker failure');
  if (scores.productFit >= 15) tags.push('Physical-friction positive');
  if (scores.movementOpportunity >= 7) tags.push('Movement-break positive', 'High movement-interest');
  if (['Under Rs1,500', 'Rs1,500–1,999', 'Free only'].indexOf(answer_(response, Q.price)) >= 0) tags.push('Price sensitive');
  if (answer_(response, Q.founderPrice) === 'I would buy it') tags.push('Founder-price ready');
  if (phone.indexOf('Android') === 0 && answer_(response, Q.beta) === 'Yes') tags.push('Android beta eligible');
  if (phone === 'iPhone' && Number(answer_(response, Q.purchaseLikelihood)) >= 4) tags.push('iPhone future waitlist');

  let primary = 'Low current fit';
  if (phone === 'iPhone' && Number(answer_(response, Q.purchaseLikelihood)) >= 4) primary = 'iPhone waitlist';
  else if (scores.total >= CONFIG.hotLeadThreshold && phone.indexOf('Android') === 0 && hasConsent) primary = 'Hot beta lead';
  else if (scores.total >= CONFIG.warmLeadThreshold) primary = 'Warm lead';
  else if (scores.total >= CONFIG.researchLeadThreshold) primary = 'Research lead';
  return {primary: primary, tags: Array.from(new Set(tags))};
}

function normalizeNamedValues_(namedValues) {
  const result = {};
  Object.keys(namedValues || {}).forEach(function(key) {
    result[key] = Array.isArray(namedValues[key]) ? namedValues[key] : [namedValues[key]];
  });
  return result;
}

function answer_(response, title) {
  const value = response && response[title];
  if (Array.isArray(value)) return value.filter(String).join(', ').trim();
  return value == null ? '' : String(value).trim();
}

function testLeadScoring() {
  const cases = buildScoringTestCases_();
  cases.forEach(function(testCase) {
    const actual = scoreResponse_(testCase.response);
    const pass = ['focusPain', 'productFit', 'movementOpportunity', 'commercialIntent', 'betaReadiness', 'total']
      .every(function(key) { return actual[key] === testCase.expected[key]; });
    Logger.log('%s | expected=%s | actual=%s | %s', testCase.name, JSON.stringify(testCase.expected), JSON.stringify({focusPain: actual.focusPain, productFit: actual.productFit, movementOpportunity: actual.movementOpportunity, commercialIntent: actual.commercialIntent, betaReadiness: actual.betaReadiness, total: actual.total}), pass ? 'PASS' : 'FAIL');
  });
}

function buildScoringTestCases_() {
  const base = function(values) { const r = {}; Object.keys(values).forEach(function(k) { r[k] = [values[k]]; }); return r; };
  return [
    {name: 'High-intent Android freelancer', response: base({[Q.role]:'Freelancer',[Q.phone]:'Android with NFC',[Q.checks]:'More than 10 times',[Q.overrun]:'Yes, more than once',[Q.returnTime]:'More than 15 minutes',[Q.impact]:'5',[Q.triedMethod]:'An app blocker',[Q.bypass]:'I disable the blocker',[Q.usefulness]:'5',[Q.distance]:'I would unlock less often',[Q.pause]:'Useful pause',[Q.placement]:'Across the room',[Q.purchaseLikelihood]:'5',[Q.price]:'Rs2,500–2,999',[Q.founderPrice]:'I would buy it',[Q.deposit]:'Yes',[Q.beta]:'Yes',[Q.email]:'test@example.com',[Q.consent]:'I agree to be contacted about Bricks research, beta testing and future availability.'}), expected:{focusPain:30,productFit:25,movementOpportunity:10,commercialIntent:30,betaReadiness:5,total:100}},
    {name: 'Interested price-sensitive student', response: base({[Q.role]:'University student',[Q.phone]:'Android — not sure about NFC',[Q.checks]:'3–5 times',[Q.overrun]:'Yes, once',[Q.returnTime]:'Less than 5 minutes',[Q.impact]:'3',[Q.usefulness]:'4',[Q.distance]:'It would make no difference',[Q.pause]:'Neither',[Q.placement]:'On my desk',[Q.purchaseLikelihood]:'4',[Q.price]:'Under Rs1,500',[Q.founderPrice]:'I might buy it',[Q.deposit]:'Maybe',[Q.beta]:'No'}), expected:{focusPain:4,productFit:9,movementOpportunity:0,commercialIntent:12,betaReadiness:0,total:25}},
    {name: 'Interested iPhone respondent', response: base({[Q.phone]:'iPhone',[Q.checks]:'6–10 times',[Q.overrun]:'No',[Q.returnTime]:'Immediately',[Q.impact]:'4',[Q.usefulness]:'5',[Q.distance]:'I would unlock less often',[Q.pause]:'Mostly useful',[Q.placement]:'Across the room',[Q.purchaseLikelihood]:'4',[Q.price]:'Rs2,500–2,999',[Q.founderPrice]:'I might buy it',[Q.deposit]:'No',[Q.beta]:'No'}), expected:{focusPain:14,productFit:13,movementOpportunity:8,commercialIntent:15,betaReadiness:0,total:50}},
    {name: 'Movement positive, low product interest', response: base({[Q.phone]:'Other',[Q.checks]:'0 times',[Q.overrun]:'No',[Q.returnTime]:'Immediately',[Q.impact]:'1',[Q.usefulness]:'1',[Q.distance]:'It would make no difference',[Q.pause]:'Useful pause',[Q.placement]:'In another room',[Q.purchaseLikelihood]:'1',[Q.price]:'Free only',[Q.founderPrice]:'Definitely not',[Q.deposit]:'No',[Q.beta]:'No'}), expected:{focusPain:0,productFit:0,movementOpportunity:10,commercialIntent:0,betaReadiness:0,total:10}},
    {name: 'Missing optional fields', response: base({[Q.phone]:'Android with NFC',[Q.checks]:'1–2 times',[Q.overrun]:'No',[Q.returnTime]:'Immediately',[Q.impact]:'1',[Q.usefulness]:'3',[Q.distance]:'Not sure',[Q.pause]:'It depends',[Q.placement]:'Not sure',[Q.purchaseLikelihood]:'2',[Q.price]:'Not sure',[Q.founderPrice]:'Probably not',[Q.deposit]:'No',[Q.beta]:'No'}), expected:{focusPain:0,productFit:8,movementOpportunity:0,commercialIntent:0,betaReadiness:0,total:8}},
    {name: 'No contact consent', response: base({[Q.phone]:'Android with NFC',[Q.checks]:'6–10 times',[Q.overrun]:'Yes, once',[Q.returnTime]:'5–15 minutes',[Q.impact]:'4',[Q.usefulness]:'4',[Q.distance]:'I would unlock less often',[Q.pause]:'Mostly useful',[Q.placement]:'Across the room',[Q.purchaseLikelihood]:'4',[Q.price]:'Rs2,500–2,999',[Q.founderPrice]:'I would probably buy it after testing',[Q.deposit]:'Maybe',[Q.beta]:'Yes',[Q.email]:'test@example.com'}), expected:{focusPain:22,productFit:18,movementOpportunity:8,commercialIntent:25,betaReadiness:0,total:73}}
  ];
}
