# Bricks demand-validation survey

This Apps Script project creates a neutral, mobile-friendly Google Form, its response spreadsheet, automatic lead scoring, a dashboard, and research notes. The survey is intentionally short: 20 quick required answers, followed by optional feedback and a contact section shown only to respondents who request the beta. Most people should finish in about 2–3 minutes.

## Install

1. Go to [script.google.com](https://script.google.com) and create a standalone project.
2. Create six script files named `Config.gs`, `FormBuilder.gs`, `Code.gs`, `Scoring.gs`, `Dashboard.gs`, and `ResearchNotes.gs`.
3. Copy each matching file from this folder into the Apps Script editor. `README.md` stays outside Apps Script.
4. Select `setupBricksDemandValidation` in the function menu and click **Run**.
5. Approve access to create and manage the Form and spreadsheet and to install the form-submit trigger. The trigger runs as the account that created it.
6. Open **Executions** or the execution log. It prints the Form editor URL, public survey URL, and response spreadsheet URL.

Running setup twice does not create duplicates. The saved Form and spreadsheet IDs are kept in Script Properties. If those files were deleted, clear the two script properties `BRICKS_FORM_ID` and `BRICKS_SPREADSHEET_ID` before rebuilding.

## Scoring

The total is transparent and capped at 100:

- Focus pain: 30 points, based on the respondent's most recent important hour.
- Product fit: 25 points, based on Android/NFC fit, blocker bypass, and reaction to physical friction.
- Movement opportunity: 10 points, based only on whether the short walk sounds useful and realistic. It is not a health score.
- Commercial intent: 30 points, based on stated likelihood, price, Founder-price reaction, and deposit consideration.
- Beta readiness: 5 points, awarded only with an Android beta request, contact details, and consent.

Lead thresholds live in `CONFIG`: hot 70+, warm 50–69, research 30–49, and low current fit below 30. A hot beta lead must also use Android and provide consent. Long sitting or movement interest can never create a hot lead by itself.

Run `testLeadScoring()` to test six mock objects. It only writes expected/actual results to the execution log and never inserts fake responses.

## Safe changes

- Change `founderPrice`, currency, and score thresholds in `Config.gs`. If the displayed price changes, also update the two price question strings/options in `Config.gs` and the form-building copy, then rebuild a fresh research wave.
- Question titles are keys used by the submit trigger and dashboard. Change a title only in the `Q` object; do not edit a live Form title independently.
- Changing questions after responses exist can invalidate comparisons. For a substantial survey change, create a new Apps Script project so each research wave stays interpretable.
- To repair the trigger, run `repairFormSubmitTrigger()`. It checks for an existing matching trigger before creating one.
- To rebuild formulas and charts after a deliberate question change, run `rebuildBricksDashboard()`.
- To export hot leads, filter **Scored Leads** by `Primary Segment = Hot beta lead`, then use **File → Download** in Google Sheets. Contact only respondents whose consent is `Provided`.
- `Follow-Up Status` and `Founder Notes` are deliberately editable. The response columns and calculated score columns should not be overwritten.

## Deleting the setup

There is no reset or delete function. Delete the Form, spreadsheet, and Apps Script project manually from Google Drive when you genuinely intend to remove them. This reduces the chance of accidental data loss.

## Claims guardrail

Do not claim that Bricks treats ADHD, addiction, anxiety, or another condition; repairs attention; performs a dopamine detox; prevents disease; provides proven health benefits; or that every interruption costs a fixed number of minutes. Do not turn associations into causal claims or imply expert endorsement. The **Research Notes** sheet contains the approved careful wording and sources.

## Google Forms limitation handled here

Google Forms does not offer clean conditional required-field validation based on arbitrary answers. The form therefore uses section branching: **Yes** to the private beta opens a contact section with required email and consent; **Maybe later** and **No** skip it. No payment is collected and no email or message is sent automatically.
