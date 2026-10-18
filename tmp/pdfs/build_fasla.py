from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from xml.sax.saxutils import escape

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/Fasla_Pakistan_Market_Research.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
sources=[
('Pakistan Economic Survey 2025-26: Education, Table 10.2 (2026)','https://finance.gov.pk/survey/chapter_26/10_Education.pdf'),
('PBS Household Integrated Economic Survey 2024-25: income tables','https://www.pbs.gov.pk/wp-content/uploads/2020/07/HIES-2024-25-Report-Final-1.pdf'),
('Salarzai et al. Digital Distraction in Girls\' Secondary Education (2025)','https://policyjssr.com/index.php/PJSSR/article/view/677'),
('Mirza Rafay: Pakistan IELTS Meta advertising case (2025; self-reported)','https://www.linkedin.com/posts/mirza-rafay_metaads-leadgencasestudy-ieltsmarketing-activity-7344669748724432896-BI3Z'),
('SJ Academy: O/A-Level tuition prices (accessed September 2026)','https://www.sjacademy.pk/fee-structure/'),
('Effect of schooling system and tuition fees on medical-student performance (2015)','https://www.jcmedu.org/jcmedu-articles/effect-of-the-schooling-system-and-tuition-fees-on-academic-performance-of-medical-college-students.pdf'),
('Dawn: PMDC MDCAT registrations for 2026 (11 September 2026)','https://epaper.dawn.com/DetailImage.php?StoryImage=11_09_2026_005_008'),
('JPMA: Smartphone addiction in twin-city students (2020; fieldwork 2017-18)','https://archive.jpma.org.pk/article-details/10063'),
('PMDC: MDCAT registrations (20 September 2024)','https://pmdc.pk/Documents/press/PMDC-Press-Release-20-09-2024.pdf'),
('Maqsad: MDCAT preparation batch (2026)','https://maqsad.io/mdcat'),
('Maqsad: Big Book of MDCAT (accessed September 2026)','https://maqsad.io/the-big-book-of-mdcat/buy'),
('FPSC / Press Information Department: CSS participation series (2026)','https://pid.gov.pk/site/press_detail/33307'),
('National Officers Academy: prospectus and CSS fees (2025)','https://www.lms.noacss.pk/uploads/NOACSSPROFILE.pdf'),
('PBS Labour Force Survey 2024-25: employment and wages','https://www.pbs.gov.pk/wp-content/uploads/2020/07/LFS-2024-25-Annual-Report.pdf'),
('Ayub et al. FOMO and cyberloafing among Pakistani employees (2024)','https://hnpublisher.com/ojs/index.php/OMS/article/download/636/590'),
('Peach Flower: planners, including 2026 yearly edition (accessed September 2026)','https://peachflower.pk/collections/planners'),
('PAFLA / ADB: Freelancing Landscape of Pakistan (2024), including income p.17','https://assets.pafla.org.pk/publications/Freelancing%20Landscape%20of%20Pakistan%20-%20PAFLA%20and%20ADB.pdf'),
('PAFLA: announcement of ADB study and estimated freelancer population (2024)','https://www.linkedin.com/posts/pafla-pakistan-freelancers-association_freelancers-freelancing-researchstudy-activity-7221841458507464706-Y7wh'),
('Pakistan Economic Survey 2025-26: IT and telecommunications (2026)','https://finance.gov.pk/survey/chapter_26/15_Information_Technology.pdf'),
('APP report reproduced in The Frontier Post: Faisal Mosque Itikaf (22 March 2025)','https://thefrontierpost.com/wp-content/uploads/2025/03/FP-Pages-22-3-25-P.pdf'),
('Ipsos: Pakistani Consumer Behavior for Ramadan (2026)','https://www.ipsos.com/en-pk/pakistani-consumer-behavior-ramadan-2026'),
('Tadabbur Institute: Ramadan Planner 2026 (accessed September 2026)','https://www.tadabburclub.com/shop'),
]
N='No Pakistan-specific data found'
rows=[
['Board exam students','8,972,200 estimated secondary/intermediate enrolments, 2024-25; 7,050,300 in 2022-23. Educational-level proxy, not a deduplicated board/Cambridge candidate count. [1]',f'{N} for segment pocket money/income. Household proxy: 82,179 national; 96,767 urban, 2024-25. Not student disposable income. [2]','Phone use and academic disruption: r = 0.62; heavier-user disruption effect d = 0.83. Sample: 100 schoolgirls, Peshawar, 2025. Self-reported, non-causal, not national prevalence. [3]','+27.3%, calculated: 2022-23 to estimated 2024-25 enrolment. Tuition-paying subset growth not measured. [1]','Tuition-centre demos and teacher referrals (recommended). Segment CAC unavailable. Paid-ad model: 1,115-2,230 media-only CAC. Analyst estimate, 2026: 111.48 CPL [4] / assumed 5-10% purchase conversion. Excludes labour/creative costs.','Advertised tuition: 8,500/O-Level subject/month; 10,500/A-Level, accessed 2026. [5] Actual historical extra-coaching spend: 3,756 O-Level vs 1,725 Matric/month in a selected sample, 2015. [6] No blocker WTP data.'],
['Entrance-test aspirants\nMDCAT / ECAT / NTS','138,158 MDCAT registrations, 2026, including overseas candidates. [7] Subset only; no deduplicated combined-market count found.',f'{N} for segment average. National household-income proxy: 82,179/month, 2024-25; not aspirants\' own income. [2]',f'{N} isolating entrance-test aspirants. Adjacent evidence: 60% of 702 adolescent students screened positive for smartphone addiction, Islamabad/Rawalpindi, 2017-18; published 2020. [8]','MDCAT registrations -17.6%: 167,744 in 2024 to 138,158 in 2026, calculated. Both include overseas registrations. [9, 7] Combined-market trend unknown.','Preparation academies and exam-prep communities (recommended). No measured segment CAC. Same adjacent education-ad model: 1,115-2,230 media-only CAC; analyst estimate, 2026, using 111.48 CPL and assumed 5-10% conversion. [4]','Advertised 2026 MDCAT batch: 10,000. [10] Preparation book: 5,000, accessed 2026. [11] Offered prices, not verified spending averages. No blocker WTP data.'],
['Competitive-exam candidates\nCSS / PMS','64,081 CSS screening applicants, 2025; 12,792 appeared in written exams. [12] No deduplicated CSS/PMS/university-test total found. University tests overlap the preceding segment.',f'{N} for candidate income/pocket money. National household-income proxy: 82,179/month, 2024-25; not candidate earnings. [2]',f'{N} quantifying distraction specifically among CSS/PMS candidates. Exam failure rates do not establish distraction as their cause.','CSS screening applications +8.4%: 59,133 (2023) to 64,081 (2025). Written attendance -1.7%: 13,008 to 12,792. Calculated; interest and attendance diverge. [12]','CSS academies, reading rooms and prep communities (recommended). No measured segment CAC. Adjacent education-ad model: 1,115-2,230 media-only CAC; analyst estimate, 2026, using 111.48 CPL / assumed 5-10% conversion. [4]','Advertised CSS course packages: 90,000-120,000 over 4.5 months, NOA prospectus, 2025. [13] Package-price evidence, not average actual spend. No blocker WTP data.'],
['Parents of teenagers',f'{N} for unique parent buyers in reviewed published tables. 8,972,200 estimated secondary/intermediate enrolments, 2024-25, count students, not parents; overlaps board students. [1]','Urban household mean: 96,767/month; urban highest consumption quintile: 146,920, 2024-25. Household proxies only; no teen-parent-specific mean found. [2]','Child-side evidence: 60% of 702 adolescent students screened positive for smartphone addiction, Islamabad/Rawalpindi, 2017-18; published 2020. [8] Does not measure parental concern or purchase intent.',f'{N} for parent-segment growth over the requested period. School enrolment +27.3%, 2022-23 to estimated 2024-25, is not unique-parent growth. [1]','School/tuition-centre parent groups and demos (recommended). No measured CAC. Proposed commission: 500-800 per completed sale; analyst pilot assumption, 2026. Not a benchmark or fully loaded CAC; excludes staff, demos and samples.','Advertised school-age tuition: 8,500-10,500 per subject/month, accessed 2026. [5] Adjacent paid offering; no segment-average screen-control spending or blocker WTP data.'],
['Young corporate / remote professionals\nLahore / Karachi / Islamabad',f'{N} for exact age/city/work-arrangement intersection. Broad context: about 4,709,200 professionals nationally = 77.2m employed x 6.1%, 2024-25. Includes other ages and places. [14]','62,822/month national mean wage for salaried professionals, 2024-25. Occupational proxy, not the exact urban-young cohort. [14]','FOMO correlated with non-work internet use: r = 0.44, p < 0.01; 238 employees in Islamabad/Rawalpindi, 2024. Documents workplace distraction, not lost hours or national prevalence. [15]',f'{N} for exact cohort over requested period. Longer-window wage proxy: +50.2% nominal, 41,815 (2020-21) to 62,822 (2024-25). Outside requested window; not inflation-adjusted. [14]','Employer teams and coworking communities (recommended). No measured segment CAC. Proposed referral commission: 500-800/sale; analyst pilot assumption, 2026; excludes staff, demos and samples.','2026 yearly productivity planner advertised at 3,550. [16] Local price reference only; no evidence of this cohort\'s purchases or blocker WTP.'],
['Content creators / freelancers\nReporting lost work to social media','About 2,370,000 freelancers, industry estimate, 2024. [18] No count found for distraction-affected subset, or a deduplicated creator/freelancer total.','34.69% earn below 15,000/month. Median falls in 30,000-50,000 band, calculated from cumulative brackets. Representative mean not found. PAFLA/ADB, 2024. [17]',f'{N} quantifying social-media distraction or work hours lost specifically in this segment. Internet-outage losses measure a different problem.','Tech-freelancer receipts +51%, corresponding July-March periods FY2025 to FY2026. Revenue proxy, not headcount/spending. Comparable multi-year series for exact segment not found. [19]','PAFLA and coworking communities (recommended); government centres host about 4,600 freelancers, 2026. [19] No measured CAC. Proposed 500-800/sale referral commission; analyst pilot assumption, 2026, excluding other acquisition costs.','2026 productivity planner offered at 3,550. [16] No Pakistan-specific data found on actual segment spending on planners/productivity tools or blocker WTP.'],
['Ramadan / Itikaf\nDigital-detox seekers',f'{N} for national detox buyers or Itikaf participants. Local audience: about 1,000 Faisal Mosque participants, 2025; not a national estimate. [20]',f'{N} for segment income. National household-income proxy: 82,179/month, 2024-25. [2]','78% planned to reduce digital-media consumption during Ramadan, Ipsos Pakistan, 2026. Stated detox intent, not measured impairment or buying intent. [21]',f'{N} for comparable segment-size/spending growth. In 2026, 65% planned to cut Ramadan shopping due to inflation; intention, not historical growth. [21]','Islamic learning communities and Ramadan-planner sellers (recommended). No measured CAC. Proposed seller referral commission: 500/sale; analyst pilot assumption, 2026, excluding other acquisition costs.','Ramadan Planner 2026 advertised at 1,550. [22] Relevant planning-product price, not verified average spend. No Pakistan-specific blocker WTP data.']
]

W,H=landscape(A4)
styles={
'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=23,leading=27,textColor=colors.HexColor('#14232e')),
'sub':ParagraphStyle('sub',fontName='Helvetica',fontSize=10,leading=14,textColor=colors.HexColor('#47545d')),
'cell':ParagraphStyle('cell',fontName='Helvetica',fontSize=9,leading=12,textColor=colors.HexColor('#17222b')),
'head':ParagraphStyle('head',fontName='Helvetica-Bold',fontSize=9,leading=11,textColor=colors.white),
'rec':ParagraphStyle('rec',fontName='Helvetica',fontSize=11,leading=16,textColor=colors.HexColor('#17222b')),
'ref':ParagraphStyle('ref',fontName='Helvetica',fontSize=9,leading=12,spaceAfter=11,wordWrap='CJK'),
}
def p(s,style='cell'):
    return Paragraph(escape(s).replace('\n','<br/>'),styles[style])
def footer(c,d):
    c.setStrokeColor(colors.HexColor('#bcc3c7')); c.line(30,29,W-30,29)
    c.setFont('Helvetica',8); c.setFillColor(colors.HexColor('#58636b'))
    c.drawString(30,17,'FASLA  |  Pakistan launch-segment research  |  20 September 2026')
    c.drawRightString(W-30,17,f'{d.page}')
doc=SimpleDocTemplate(str(OUT),pagesize=(W,H),rightMargin=30,leftMargin=30,topMargin=28,bottomMargin=43,title='Fasla | Pakistan launch-segment research',author='Market research for Fasla')
story=[]
headers=['Segment','Size (#)','Spending Power\n(PKR/mo)','Pain Evidence\n(stat + source)','Growth (%)','Best Channel +\nEst. CAC (PKR)','Willingness to Pay\n(PKR)']
widths=[79,111,109,120,103,140,W-60-662]
for idx,group in enumerate([rows[:2],rows[2:4],rows[4:6],rows[6:]]):
    if idx:story.append(PageBreak())
    story.append(p('Fasla | Pakistan market comparison' if idx==0 else 'Pakistan market comparison', 'title'))
    story.append(Spacer(1,7))
    story.append(p(['Board and entrance-exam audiences','Competitive exams and parent buyers','Professionals and freelancers','Seasonal demand and launch recommendation'][idx],'sub'))
    story.append(Spacer(1,12))
    table=Table([[p(h,'head') for h in headers]]+[[p(c) for c in r] for r in group],colWidths=widths,repeatRows=1,hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#253945')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11),('GRID',(0,0),(-1,-1),.45,colors.HexColor('#c4ccd1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f2f4f5')]),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold')]))
    story.append(table)
    story.append(Spacer(1,10))
    story.append(p('Reading the table: bracketed numbers refer to the source register. Proxies, offered prices and analyst CAC assumptions are not measured segment outcomes. All monetary figures are PKR.','sub'))
    if idx==3:
        story.append(Spacer(1,21));story.append(p('Recommended first segment','title'));story.append(Spacer(1,9))
        story.append(p('Launch first to parent-funded board-exam students already attending paid tuition, through their tuition centres. The clearest affordability anchor is PKR 8,500 per subject per month advertised by SJ Academy (accessed 2026) [5], alongside documented academic disruption [3] and 27.3% expansion in the broader enrolment pool [1]. Start at PKR 3,000, the lower end of your supplied range. This is a provisional pick: paid orders must validate blocker willingness to pay and acquisition cost; available evidence does not prove every launch criterion for any segment.','rec'))
for start,end in [(0,11),(11,22)]:
    story.append(PageBreak()); story.append(p('Source register','title'));story.append(Spacer(1,6))
    story.append(p('Research sources retained from the comparison. Web prices accessed September 2026. URLs are clickable in the PDF.','sub'));story.append(Spacer(1,16))
    for n in range(start,end):
        title,url=sources[n]
        text=f'<b>[{n+1}] {escape(title)}</b><br/><link href="{escape(url)}" color="#344c5b">{escape(url)}</link>'
        story.append(Paragraph(text,styles['ref']))
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
import fitz
pdf=fitz.open(OUT)
print('pages',len(pdf))
for i,page in enumerate(pdf):
    page.get_pixmap(matrix=fitz.Matrix(1.25,1.25)).save(str(ROOT/f'tmp/pdfs/page-{i+1}.png'))
    print(i+1,len(page.get_text()),page.rect)
