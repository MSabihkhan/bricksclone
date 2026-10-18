from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/fasla-product-value-strategy.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialBold',italic='Arial',boldItalic='ArialBold')
W,H=595.28,841.89
INK=HexColor('#182D32'); GREEN=HexColor('#167568'); MUTED=HexColor('#56676B'); LINE=HexColor('#D8E2DF')
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Fasla | Making the brick worth buying')
c.setAuthor('Product strategy research')
body=ParagraphStyle('body',fontName='Arial',fontSize=9,leading=12.1,textColor=INK)
small=ParagraphStyle('small',parent=body,fontSize=8,leading=10.5)
head=ParagraphStyle('head',parent=body,fontName='ArialBold',textColor=white,fontSize=8.5,leading=11)
y=0
def para(text,style=body): return Paragraph(text,style)
def text(s,style=body,gap=10):
 global y
 p=para(s,style); _,h=p.wrap(W-72,900); p.drawOn(c,36,y-h); y-=h+gap
def title(n,label,heading,sub):
 global y
 c.setFillColor(GREEN); c.rect(0,H-9,W,9,fill=1,stroke=0)
 c.setFont('ArialBold',9); c.drawString(36,H-38,'FASLA / BRICKSAPP')
 c.setFillColor(MUTED); c.setFont('Arial',8); c.drawRightString(W-36,H-38,'PRODUCT VALUE STRATEGY  |  29 SEP 2026')
 y=H-69
 text(label.upper(),ParagraphStyle('eyebrow',parent=small,textColor=GREEN,fontName='ArialBold'),7)
 text(heading,ParagraphStyle('title',parent=body,fontName='ArialBold',fontSize=24,leading=28),9)
 text(sub,body,15)
def section(s):
 text(s,ParagraphStyle('section',parent=body,fontName='ArialBold',fontSize=12,leading=15),7)
def table(headers,rows,widths,fs=9):
 global y
 sty=ParagraphStyle('cell',parent=body,fontSize=fs,leading=fs*1.34)
 data=[[para(h,head) for h in headers]]+[[para(v,sty) for v in row] for row in rows]
 t=Table(data,colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#F0F5F3')]),('LINEBELOW',(0,1),(-1,-1),0.45,LINE)]))
 _,h=t.wrap(W-72,900)
 if y-h<47: raise RuntimeError(f'Page overflow: bottom {y-h:.1f}')
 t.drawOn(c,36,y-h); y-=h+13
def end(n):
 if y<47: raise RuntimeError(f'Text overflow {y}')
 c.setStrokeColor(LINE); c.line(36,39,W-36,39)
 c.setFillColor(MUTED); c.setFont('Arial',7.5); c.drawString(36,25,'Decision brief | Evidence, product judgment and proposed tests are distinguished.')
 c.drawRightString(W-36,25,f'{n} / 4'); c.showPage()

title(1,'01 / Market & positioning','Make the brick worth buying','Recommendation: sell a practical daily routine system, with focused work at its centre. Add uses that make the same physical object valuable every day.')
table(['Decision','Recommended direction'],[
('<b>Core promise</b>','<b>One tap to start what matters. A clear record of what you finished.</b><br/>Launch around Study / Work, optional Prayer, and Wind-down routines. A card, tag or brick can use the same app logic.'),
('<b>First buyer</b>','Start with adult university / exam students who own NFC-enabled Android phones; test freelancers as a second segment. Their concrete jobs are finishing revision and delivering work. This is a segment hypothesis, not validated demand.'),
('<b>Why pay?</b>','The object creates a deliberate physical commitment; the app adds useful routines and visible outcomes. Modes alone are not differentiation: the original Brick already offers custom modes. [3]'),
('<b>Commercial offer</b>','Test a one-time hardware purchase including core offline routines, reminders and personal progress. Charge later for optional group / team services only if ongoing value and server costs justify it. Set price after landed cost, delivery, returns and support are known.')
],[116,407])
section('What Pakistani market evidence supports')
table(['Evidence or uncertainty','Product consequence'],[
('GSMA identifies affordability, digital skills and social norms as adoption barriers in Pakistan; shared-phone use also matters. [1]','Keep setup short, offer Urdu and English, make core use offline, and check NFC compatibility before purchase. Do not assume every smartphone can read the tag.'),
('SBP reports 88% of recorded retail-payment transactions used digital channels in FY25. This is not 88% of all purchases or buyers. [2]','Offer familiar local payment routes through supported providers. Test wallet / Raast checkout and COD economics; the statistic does not establish willingness to buy this product.'),
('"People do not buy impulsively" is a founder hypothesis, not a proven rule for all Pakistanis.','Validate with a working demo and paid pilot. Compare "finish your study plan" with "one brick, three daily routines"; measure purchases and repeat use, not likes.')
],[240,283],8.8)
text('<b>Current fit:</b> the repository contains Android NFC, blocking, local session storage, insights and emergency flows. This is a code/document review, not a device-tested capability audit. The website uses the name Fasla; this brief keeps that working brand.',small,0)
end(1)

title(2,'02 / One brick, several useful jobs','Keep the physical action meaningful','One tag can trigger multiple routines through the app. Choose a default routine by schedule, show a small action chooser when needed, and make each action explicit.')
table(['Idea / verdict','Useful version and role of the brick','Constraint / priority'],[
('<b>Prayer reminder</b><br/>KEEP + REFINE','An optional reminder leads the user to tap at their prayer space; the tap acknowledges arrival and can start a quiet focus period. Support local prayer-time settings, calculation method / Asr preference and manual adjustment.','<b>Launch pilot</b><br/>Allow silent, snooze, travel / pause and emergency dismissal. Never label a tap "prayer completed" or publish religious streaks.'),
('<b>Study / work ritual</b><br/>BUILD FIRST','Select one deliverable, tap to block distractions, then record Done / Partial / Not done and the next step. Keep sessions named, e.g. "Revise chapter 4".','<b>Launch core</b><br/>Allow essential apps. Physical return should reinforce commitment; confirm before a tap ends an active session.'),
('<b>Bedtime / family time</b><br/>NEW: STRONG FIT','Tap the same tag to begin an evening distraction block or a phone-free meal. Include a morning / end-of-routine return tap and optional reflection.','<b>Launch preset</b><br/>No extra hardware needed. Preserve calls and user-selected essentials. Measure routine use, not claimed sleep improvement.'),
('<b>Automation</b><br/>KEEP, START SMALL','Tap -> select routine -> apply block list + start timer + open a task checklist. Later, let users configure a calendar shortcut or an authenticated webhook.','<b>Local first; cloud later</b><br/>A passive tag triggers the phone; it does not run automation alone. External actions require supported APIs, permissions and internet.'),
('<b>Team attendance / time</b><br/>SEPARATE PILOT','Mount one shared tag at an office or study room. Each signed-in member explicitly selects Check in / Check out; show their own times, corrections and a manager summary.','<b>After consumer traction</b><br/>A basic tag is not fraud-proof proof of identity or location. No payroll-grade claim; no access to personal distraction histories. [8]'),
('<b>Capture the flag</b><br/>DEFER FULL GAME','Test a supervised campus scavenger event first. One tag can be a shared checkpoint; a multi-location course needs more tags. Players scan to log a checkpoint.','<b>Acquisition experiment</b><br/>Use fixed safe venues, cooldowns and no live location feed. Keep game points separate from focus progress; prove repeat interest first.')
],[105,260,158],8.65)
text('<b>Placement is a real trade-off:</b> one tag cannot stay at a desk, prayer space and office simultaneously. Choose one convenient home anchor and time-based routines; offer optional extra tags only for separate locations. A prayer-space tag can still trigger study and bedtime modes.',small,5)
text('<b>Interaction rule:</b> acknowledging a reminder must not accidentally unlock focus or clock someone out. Show the pending action, then confirm. Android NFC routing and alarm permissions require physical-device checks; do not promise an unbreakable, always-ringing alarm. [7]',small,0)
end(2)

title(3,'03 / Beyond graphs','Show progress that matters','Make the product useful before adding a server: intention -> physical commitment -> protected session -> recorded outcome -> a better next plan.')
table(['Addition / priority','App experience','Evidence and measurement'],[
('<b>Outcome ledger</b><br/>P0: launch','Before: "What will you finish?" After: Done / Partial / Not done. Weekly summary: "4 of 6 planned tasks completed" plus next actions. Optional units: pages, practice questions, deliverables.','Outcome completion is self-reported; protected minutes are device-recorded. Keep them distinct. Track weekly completed intentions and repeat routine use, not just screen-time charts.'),
('<b>Small focus coaching</b><br/>P0: launch','Turn advice into a prompt: "After breakfast, I will tap and solve 10 questions." At distraction, offer a quick "save for later" note. End with one next step, not a feed of motivational quotes.','If-then planning has research support. [4] These exact app adaptations need testing. Attribute source ideas; have a qualified reviewer check coaching, and do not imply expert endorsement.'),
('<b>Breathing reset</b><br/>P1: optional','Offer a skippable 5-minute guided breathing session before work, with calm visuals and Urdu / English audio. Commission a clinician-reviewed script; avoid forced breath holds and stop if uncomfortable.','Balban et al. studied daily 5-minute practices for one month and found mood / arousal benefits. [5] This does not establish that a short animation improves focus, or that Fasla treats anxiety.'),
('<b>Private focus circles</b><br/>P1: test next','Opt-in groups of 3-8 friends; shared weekly intentions and a cooperative consistency target. Optional score: one point per day with a completed planned session, capped at one daily; show minutes separately.','The cap discourages all-day timer farming. A recorded session is not verified attention. Compare circle retention with solo use; exclude prayer activity and app names from shared data.'),
('<b>Public leaderboard / pool</b><br/>P2: only if demanded','Prefer pseudonyms and optional weekly leagues. Share aggregate consistency only. Keep "most distracting apps" private; if later benchmarking categories, require separate consent and sufficiently large cohorts.','Raw hours reward idle blocking and unequal free time. Server checks can remove overlaps / implausible events, not prove work. Provide leave, delete and report controls; no cash prizes.'),
('<b>Weekly experiment</b><br/>P1: new idea','Ask one practical question: "Did a shorter session help you finish?" Suggest one adjustment from the user\'s own history, then show the following week\'s result.','A 2025 trial supports reducing mobile internet exposure, but used a different intervention and had adherence challenges. [6] Treat personalized advice as a suggestion, not causal proof.')
],[111,232,180],8.65)
text('<b>Minimal cloud scope:</b> only after opt-in circles show value, add accounts, membership, aggregate session sync and deletion. Keep raw app-use events local by default; queue offline events and deduplicate on sync. A team manager should see attendance records only, never an employee\'s private focus or prayer history.',small,0)
end(3)

title(4,'04 / Validation & build order','Earn the right to expand','Ship a small, coherent promise first. The gates below are proposed decision thresholds, not industry benchmarks or existing research findings.')
table(['Stage','Action and decision gate'],[
('<b>1. Validate demand</b>','Interview 12 adult students and 8 freelancers; observe phone models and one normal day. Demo three routines. Recruit 30 paid pilot users at a cost-informed price; record refusals, compatibility failures and refunds. Do not treat verbal enthusiasm as willingness to pay.'),
('<b>2. Launch bundle</b>','Build routine routing, outcome ledger, study / bedtime presets and a prayer-reminder pilot. Retain offline use and an emergency exit. Proposed gate: 24/30 complete setup unaided; 18/30 use the brick on at least 3 days in week 2; 12/30 use two routines weekly.'),
('<b>3. Deepen retention</b>','Test private circles and reviewed breathing / coaching with retained users. Compare 4-week active use and completed intentions against solo users; use the small pilot directionally, not as statistically conclusive proof. Build the server only when group demand repeats.'),
('<b>4. Expand selectively</b>','Pilot attendance with 2 small teams, including offline sync and disputed timestamps. Require evidence of willingness to pay and manageable support. Run one campus game event separately; scale only if it attracts buyers who keep using the core product.')
],[116,407],8.6)
text('<b>Release gate:</b> verify NFC scans, background reminders, reboot recovery, battery restrictions and essential-app access on actual target phones. Offer a pre-purchase NFC check and clear replacement / lost-tag recovery. A QR fallback would lower physical commitment and must be labelled as a different mode.',small,10)
section('Evidence register / clickable sources')
table(['Ref.','Source and what it supports'],[
('[1]','<link href="https://www.gsma.com/r/wp-content/uploads/2025/06/The-Mobile-Gender-Gap-Report-2025.pdf" color="#167568">GSMA, Mobile Gender Gap Report 2025</link> - Pakistan adoption barriers; not NFC penetration or purchase intent.'),
('[2]','<link href="https://www.sbp.org.pk/PS/PDF/Annual-Payment-Systems-Review-FY25.pdf" color="#167568">State Bank of Pakistan, Payment Systems Review FY25</link> - recorded payment-channel volumes.'),
('[3]','<link href="https://support.getbrick.com/en/articles/5866945" color="#167568">Brick support, creating and editing modes</link> - competitor feature baseline; accessed 29 Sep 2026.'),
('[4]','<link href="https://doi.org/10.1016/S0065-2601(06)38002-1" color="#167568">Gollwitzer &amp; Sheeran (2006), implementation-intention meta-analysis</link> - if-then planning.'),
('[5]','<link href="https://pubmed.ncbi.nlm.nih.gov/36630953/" color="#167568">Balban et al. (2023), Cell Reports Medicine</link> - breathing, mood and physiological arousal.'),
('[6]','<link href="https://doi.org/10.1093/pnasnexus/pgaf017" color="#167568">Castelo et al. (2025), PNAS Nexus</link> - mobile-internet blocking trial; not a trial of this product.'),
('[7]','Android Developers: <link href="https://developer.android.com/develop/connectivity/nfc/nfc" color="#167568">NFC basics</link> and <link href="https://developer.android.com/develop/background-work/services/alarms" color="#167568">Schedule alarms</link> - platform behavior / permissions; accessed 29 Sep 2026.'),
('[8]','<link href="https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf" color="#167568">NXP, NTAG213/215/216 datasheet</link> - basic tag capabilities; attendance limits are an engineering inference.')
],[40,483],7.7)
text('Local context reviewed: docs/ARCHITECTURE.md, package.json, screen/service inventory and website/BRAND.md. Priorities, segment choices, prices-to-test and pilot gates are product recommendations; no Pakistan customer interviews were conducted for this brief.',small,0)
end(4)
c.save()
print(OUT)
