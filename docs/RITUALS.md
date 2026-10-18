# Rituals and prayer reminders — what they are and why

*Last updated 2026-10-04. Source of truth for the copy in `src/features/rituals.ts` and `src/features/prayer.ts`. If you change a claim here, change the in-app copy too, and the other way round.*

## The concept model

Users were seeing "rituals", "modes", and "Bricks" side by side with no explanation of how they relate. The model is:

| Concept | Answers | Lives in | Example |
| --- | --- | --- | --- |
| **Brick** | *Where* and *how strict* | Each registered NFC tag: name, location, mode, duration, strict | "Desk — Deep Work, strict" |
| **Ritual** | *Why* this session | Chosen per session on Home | "Study: revise chapter 4" |
| **Blocked apps** | *What* is blocked | One global list today | Instagram, YouTube |
| **Session** | What actually happened | SQLite `sessions` row | 52 min, ended by Brick tap, outcome "partial" |

On Home this is now asked as two questions in order: **"What's this session for?"** (ritual) then **"Which Brick?"** (setup). Each Brick card shows its mode as the title, the Brick's name small in the corner, and the two facts that distinguish it: how it ends and whether it is strict.

## How every ritual flows

1. **Name one intention.** A short, concrete sentence before blocking starts.
2. **Tap the Brick.** Blocking starts; the Brick stays where it lives.
3. **Close the loop.** For study and work only: done / partial / not done, plus one next step that pre-fills the next session.

## The evidence, and how far it goes

These sources inform the copy. Each claim in the app is written to be no stronger than the evidence.

1. **Specific plans get done more often.** Gollwitzer & Sheeran (2006) combined 94 tests of "implementation intentions" (plans that say exactly what you will do and when) and found a medium-to-large average effect on goal attainment (d = 0.65). Goal-setting research (Locke & Latham, 2002) likewise finds specific goals outperform "do your best". → *Study and work ask "What will you finish/deliver?" and coach the user to be concrete.*
   - Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. *Advances in Experimental Social Psychology, 38*, 69–119.
   - Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation. *American Psychologist, 57*(9), 705–717.

2. **Switching tasks leaves attention behind.** Leroy (2009) showed that after switching away from an unfinished task, part of people's attention stays on it ("attention residue") and performance on the next task suffers. → *Work ritual: one deliverable per session.*
   - Leroy, S. (2009). Why is it so hard to do my work? The challenge of attention residue when switching between work tasks. *Organizational Behavior and Human Decision Processes, 109*(2), 168–181.

3. **Writing down the next step quiets unfinished goals.** Masicampo & Baumeister (2011) found unfinished goals cause intrusive thoughts and hurt unrelated tasks, and that making a specific plan for them removed those effects. → *The outcome sheet asks for "one next step", and that step pre-fills the next intention.*
   - Masicampo, E. J., & Baumeister, R. F. (2011). Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals. *Journal of Personality and Social Psychology, 101*(4), 667–683.

4. **Phone use after lights-out is linked with worse sleep.** In 844 adults, texting and calls after lights-out predicted longer time to fall asleep, more disturbance, and more fatigue (Exelmans & Van den Bulck, 2016). This is a **correlational** survey — it does not prove the phone caused the poor sleep — so the app says "linked with", not "causes". → *Bedtime ritual.*
   - Exelmans, L., & Van den Bulck, J. (2016). Bedtime mobile phone use and sleep in adults. *Social Science & Medicine, 148*, 93–101.

5. **Phones at the table reduce enjoyment.** In a field experiment with 300+ people dining with friends or family, those told to keep phones out felt more distracted and enjoyed the meal less — a modest effect, about half a point on a 7-point scale (Dwyer, Kushlev & Dunn, 2018). → *Family time ritual.*
   - Dwyer, R. J., Kushlev, K., & Dunn, E. W. (2018). Smartphone use undermines enjoyment of face-to-face social interactions. *Journal of Experimental Social Psychology, 78*, 233–239.

**Deliberately not claimed:** the "phone on the desk drains your brain" finding (Ward et al., 2017) is widely quoted but replications have been mixed, so the app does not rely on it.

## The five rituals

| Ritual | For | Asks | Graded afterwards? | Suggested Brick setup |
| --- | --- | --- | --- | --- |
| Study | Finishing one concrete piece of coursework | "What will you finish?" | Yes | 50 min · strict |
| Work | One deliverable without task-switching | "What will you deliver?" | Yes | 50–90 min · strict |
| Bedtime | Winding down without the phone | "What are you winding down for?" | No | Ends on Brick tap · keep calls unblocked |
| Family time | Attention for the people present | "Who gets your attention now?" | No | Ends on Brick tap · flexible |
| Quiet prayer time | Notification-free minutes | "Set a quiet intention" | **Never** | 15 min · time limit |

**Why only study and work are graded.** Asking "done / partial / not done" makes sense for a task. For bedtime, family time, or prayer it is the wrong question — and for prayer it would contradict the app's promise never to record whether someone prayed. Before this change the outcome sheet appeared after *every* session with an intention, prayer included; it is now limited to study and work (`OUTCOME_ROUTINE_TYPES`), and the Insights ledger counts only those. Insights now also shows **time per ritual**, which applies to all five.

## Prayer reminders

**What they do:** a local notification at each time the user sets — "Time for Asr. Take a quiet pause." Nothing else. They don't start a session, don't block apps by themselves, and never record a prayer as performed or missed.

**What changed:**

- Multiple reminders (up to 10), each with its own name, time, and on/off switch.
- One tap adds the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) with placeholder times the user then adjusts.
- Changes save and reschedule immediately; there is no separate Save button to forget.
- Each alarm reschedules from its own stored clock time, so late deliveries never accumulate into drift.
- The single reminder from the first version is migrated automatically, both in JS settings and in the native scheduler (for users who reboot before opening the screen).

**Known limits, stated in the app:**

- **Fixed clock times drift against real prayer times.** Prayer times follow the sun and move by a minute or two a day; Maghrib can move by over an hour across a year. Users are told to check their local timetable every few weeks.
- **Delivery can be a few minutes late.** Alarms are inexact (`setAndAllowWhileIdle`). Exact alarms need `SCHEDULE_EXACT_ALARM`, which is denied by default on Android 14+ and policy-sensitive on Play, so it is not used.

**Recommended next step:** calculated prayer times from the user's city, computed on the phone. The `adhan` JavaScript library does this offline using published astronomical formulas and supports the Karachi method and Hanafi Asr used in Pakistan. Asking for a city (not GPS) avoids a location permission. This also fixes both limits above — the reminder list could recompute tomorrow's times each night.

## Breathing reset

**What it is:** an optional 1, 2 or 5 minute guided exercise from Home, before a session. Cyclic sighing: breathe in through the nose (2.5 s), a short second inhale to top up (1 s), then a long slow exhale through the mouth (5.5 s). About 6–7 breaths a minute. A light buzz marks each new breath so it can be followed with eyes closed; with Reduce Motion on, the circle stays still and the text cues carry it.

**Why this exercise:** Balban et al. (2023) randomised 111 healthy adults to 5 minutes a day for a month of cyclic sighing, box breathing, cyclic hyperventilation, or mindfulness meditation. Breathwork beat mindfulness on improving mood and lowering resting breathing rate, and the authors single out the exhale-focused cyclic sighing as the strongest. Reviews of slow-paced breathing (e.g. Zaccaro et al., 2018) report short-term reductions in anxiety, with mixed study quality.

**Limits, kept in the copy:** healthy adults, self-reported mood, one month. The app says it helps you settle, makes no medical claim, and tells people to stop if they feel lightheaded.

- Balban, M. Y., et al. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. *Cell Reports Medicine, 4*(1), 100895.
- Zaccaro, A., et al. (2018). How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. *Frontiers in Human Neuroscience, 12*, 353.

## Open decisions

- Should a Brick remember its usual ritual (bedroom Brick → Bedtime)? Cheap to add; removes a tap.
- Should bedtime and family time get their own lighter reflection ("Did you stay off the phone?") instead of none?
- Per-Brick block lists would make the Brick cards real configurations rather than labels. Today the app-blocked list is global.
