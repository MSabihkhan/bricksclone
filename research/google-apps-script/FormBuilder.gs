function buildBricksForm_(form) {
  form.setTitle('Bricks: Focus and Digital Distraction Study')
    .setDescription(
      'A quick, 2–3 minute reality check on phone distraction during work and study.\n\n' +
      'First, think about your most recent important focus session. Then you’ll see an early product concept called Bricks. There are no right answers—honest specifics are the useful part.\n\n' +
      'Bricks is an experimental Android product, not a medical device. Contact details are requested only if you ask to join the private beta.'
    )
    .setConfirmationMessage('Done — thank you. Your honest answers are much more useful than perfect-looking ones.')
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setShowLinkToRespondAgain(false);

  addSection_(form, '1 of 3 · Quick context', 'Three taps, then we get to the interesting bit.');
  addChoice_(form, Q.role, OPTIONS.roles, true, true);
  addChoice_(form, Q.work, OPTIONS.work, true, false);
  addChoice_(form, Q.phone, OPTIONS.phones, true, false);

  addSection_(form, '2 of 3 · Your last focus session', 'Think about your most recent important hour of work or study—not your best day and not your worst.');
  addChoice_(form, Q.checks, OPTIONS.checks, true, false);
  addChoice_(form, Q.overrun, OPTIONS.overrun, true, false);
  addChoice_(form, Q.returnTime, OPTIONS.returnTime, true, false)
    .setHelpText('This is your estimate, not a measured recovery time.');
  addChoice_(form, Q.mainApp, OPTIONS.apps, true, false);
  addScale_(form, Q.impact, 'No effect', 'A major effect');
  addChoice_(form, Q.triedMethod, OPTIONS.methods, true, false);
  addChoice_(form, Q.bypass, OPTIONS.bypass, true, false);

  addSection_(form, '3 of 3 · Meet Bricks',
    'Bricks is an early Android focus product paired with a physical NFC object. You tap the Brick to block chosen apps, then return and tap it again to unlock them. It can stay on your desk or sit farther away to add a deliberate pause. Bricks does not guarantee improved productivity or health outcomes.');
  addScale_(form, Q.usefulness, 'Much less useful', 'Much more useful');
  addChoice_(form, Q.distance, OPTIONS.distance, true, false);
  addChoice_(form, Q.pause, OPTIONS.pause, true, false);
  addChoice_(form, Q.placement, OPTIONS.placements, true, false);
  addChoice_(form, Q.concern, OPTIONS.concerns, true, false);
  addScale_(form, Q.purchaseLikelihood, 'Definitely would not', 'Definitely would');
  addChoice_(form, Q.price, OPTIONS.prices, true, false);
  addChoice_(form, Q.founderPrice, OPTIONS.founderReactions, true, false);
  addChoice_(form, Q.deposit, OPTIONS.deposit, true, false)
    .setHelpText('This question collects no payment and creates no obligation.');

  const betaItem = form.addMultipleChoiceItem().setTitle(Q.beta).setRequired(true);
  const contactPage = form.addPageBreakItem()
    .setTitle('Private beta contact')
    .setHelpText('You chose “Yes,” so we need one reliable way to reach you.');
  form.addTextItem().setTitle(Q.name).setRequired(false);
  const emailValidation = FormApp.createTextValidation()
    .requireTextIsEmail()
    .setHelpText('Enter a valid email address.')
    .build();
  form.addTextItem().setTitle(Q.email).setRequired(true).setValidation(emailValidation);
  form.addTextItem().setTitle(Q.whatsapp).setRequired(false)
    .setHelpText('Optional. Include country code, for example +92.');
  form.addCheckboxItem().setTitle(Q.consent)
    .setChoiceValues(['I agree to be contacted about Bricks research, beta testing and future availability.'])
    .setRequired(true);

  const finalPage = form.addPageBreakItem().setTitle('Final thought');
  form.addParagraphTextItem().setTitle(Q.feedback).setRequired(false);
  finalPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  betaItem.setChoices([
    betaItem.createChoice('Yes', contactPage),
    betaItem.createChoice('Maybe later', finalPage),
    betaItem.createChoice('No', finalPage)
  ]);
}

function addSection_(form, title, helpText) {
  return form.addPageBreakItem().setTitle(title).setHelpText(helpText || '');
}

function addChoice_(form, title, values, required, showOther) {
  const item = form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(values)
    .setRequired(required);
  if (showOther) item.showOtherOption(true);
  return item;
}

function addScale_(form, title, left, right) {
  return form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 5)
    .setLabels('1 · ' + left, '5 · ' + right)
    .setRequired(true);
}
