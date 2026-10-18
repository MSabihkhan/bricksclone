const CONFIG = Object.freeze({
  productName: 'Bricks',
  founderPrice: 2499,
  currency: 'PKR',
  betaLocation: 'Pakistan',
  hotLeadThreshold: 70,
  warmLeadThreshold: 50,
  researchLeadThreshold: 30
});

const PROPERTY_KEYS = Object.freeze({
  formId: 'BRICKS_FORM_ID',
  spreadsheetId: 'BRICKS_SPREADSHEET_ID'
});

const SHEETS = Object.freeze({
  scored: 'Scored Leads',
  dashboard: 'Dashboard',
  research: 'Research Notes'
});

const Q = Object.freeze({
  role: 'Which best describes you right now?',
  work: 'What kind of task were you doing?',
  phone: 'What phone do you mainly use?',
  checks: 'In that hour, how many times did you open your phone without planning to?',
  overrun: 'Did any quick phone check last longer than you meant it to?',
  returnTime: 'After a phone check, how long did it feel like it took to get fully back into the task?',
  mainApp: 'Which app pulled you away most?',
  impact: 'How much did phone distraction affect that session?',
  triedMethod: 'What have you relied on most to reduce phone distraction?',
  bypass: 'When you really want a blocked app, what usually happens?',
  usefulness: 'Compared with a software-only blocker, how useful would the physical Brick be to you?',
  distance: 'If the Brick were 5–20 steps away, what would most likely happen?',
  pause: 'Would that short walk feel useful or annoying?',
  placement: 'Where would you realistically keep it?',
  concern: 'What is your biggest concern about Bricks?',
  purchaseLikelihood: 'If Bricks worked reliably, how likely would you be to buy it?',
  price: 'What feels like a reasonable one-time price for the Brick and Android app?',
  founderPrice: 'At a Founder price of Rs2,499 plus delivery, what is your honest reaction?',
  deposit: 'After a successful test, would you consider a refundable Rs1,000 reservation deposit?',
  beta: 'Would you like to test the private Android beta?',
  name: 'Name',
  email: 'Email address',
  whatsapp: 'WhatsApp number',
  consent: 'Contact consent',
  feedback: 'One last thing: what would you change about Bricks?'
});

const OPTIONS = Object.freeze({
  roles: ['University student', 'School or college student', 'Freelancer', 'Remote employee', 'Office employee', 'Business owner', 'Teacher or trainer', 'Other'],
  work: ['Programming or technical work', 'Writing or research', 'Designing or video editing', 'University study', 'Exam preparation', 'Administrative or office work', 'Client communication', 'Teaching', 'Other'],
  phones: ['Android with NFC', 'Android without NFC', 'Android — not sure about NFC', 'iPhone', 'Other'],
  checks: ['0 times', '1–2 times', '3–5 times', '6–10 times', 'More than 10 times', 'Not sure'],
  overrun: ['No', 'Yes, once', 'Yes, more than once', 'Not sure'],
  returnTime: ['Immediately', 'Less than 5 minutes', '5–15 minutes', 'More than 15 minutes', 'I did not return to the task', 'Not sure'],
  apps: ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'Facebook', 'X/Twitter', 'Snapchat', 'Games', 'News', 'Email', 'Another app', 'None during that session'],
  methods: ['Do Not Disturb', 'Digital Wellbeing / Screen Time', 'An app blocker', 'A timer or Pomodoro', 'Putting the phone elsewhere', 'Turning the phone off', 'A physical focus device', 'Nothing yet', 'Something else'],
  bypass: ['I wait until the session ends', 'I disable the blocker', 'I use an emergency bypass', 'I switch to another device', 'I do not use a blocker', 'It depends'],
  distance: ['I would unlock less often', 'It would make no difference', 'I would find it annoying but still use it', 'I would stop using Bricks', 'Not sure'],
  pause: ['Useful pause', 'Mostly useful', 'Neither', 'Mostly annoying', 'Very annoying', 'It depends'],
  placements: ['On my desk', 'On a nearby shelf', 'Across the room', 'Near the door', 'In another room', 'I would carry it', 'I would not use it', 'Not sure'],
  concerns: ['Urgent access', 'Losing or forgetting it', 'NFC reliability', 'Accessibility permission', 'Privacy', 'Battery use', 'Android-only availability', 'Carrying another object', 'Price', 'No major concern', 'Something else'],
  prices: ['Under Rs1,500', 'Rs1,500–1,999', 'Rs2,000–2,499', 'Rs2,500–2,999', 'Rs3,000–3,499', 'Rs3,500 or more', 'Free only', 'Not sure'],
  founderReactions: ['I would buy it', 'I would probably buy it after testing', 'I might buy it', 'Probably not', 'Definitely not'],
  deposit: ['Yes', 'Maybe', 'No'],
  beta: ['Yes', 'Maybe later', 'No']
});

const SCORED_LEAD_HEADERS = Object.freeze([
  'Timestamp', 'Name', 'Email', 'WhatsApp', 'Role', 'City', 'Phone Type',
  'Focus Pain Score', 'Product Fit Score', 'Movement Opportunity Score',
  'Commercial Intent Score', 'Beta Readiness Score', 'Total Score',
  'Primary Segment', 'Additional Tags', 'Purchase Intent', 'Price Range',
  'Deposit Intent', 'Contact Consent', 'Follow-Up Status', 'Founder Notes'
]);
