from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Bricks_Short_Survey_Questions.pdf"

INK = colors.HexColor("#171717")
MUTED = colors.HexColor("#666666")
BLUE = colors.HexColor("#315EFB")
PALE_BLUE = colors.HexColor("#EEF2FF")
LINE = colors.HexColor("#D8DCE8")


class SurveyDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="main",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="survey", frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(doc.leftMargin, 9 * mm, "BRICKS - SHORT DEMAND-VALIDATION SURVEY")
        canvas.drawRightString(A4[0] - doc.rightMargin, 9 * mm, f"PAGE {doc.page}")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=9, leading=12, textColor=BLUE, spaceAfter=7, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=27, leading=31, textColor=INK, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverBody", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=11, leading=17, textColor=MUTED, alignment=TA_CENTER, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Section", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=18, leading=22, textColor=INK, spaceBefore=0, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="SectionNote", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=MUTED, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="Question", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=10.5, leading=14, textColor=INK, spaceBefore=4, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Option", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.2, leading=12, leftIndent=12, firstLineIndent=-8,
    textColor=colors.HexColor("#333333"), spaceAfter=1.5,
))
styles.add(ParagraphStyle(
    name="Help", parent=styles["BodyText"], fontName="Helvetica-Oblique",
    fontSize=8.5, leading=12, leftIndent=4, textColor=MUTED, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Concept", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10, leading=15, textColor=INK, backColor=PALE_BLUE,
    borderColor=colors.HexColor("#C8D2FF"), borderWidth=0.7,
    borderPadding=10, spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="Small", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=5,
))


def safe(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def question(number, text, options=None, note=None, optional=False, scale=None):
    label = f"{number}. {safe(text)}"
    if optional:
        label += " <font color='#666666'>(Optional)</font>"
    items = [Paragraph(label, styles["Question"])]
    if scale:
        left, right = scale
        items.append(Paragraph(f"- 1 = {safe(left)} &nbsp;&nbsp; 2 &nbsp;&nbsp; 3 &nbsp;&nbsp; 4 &nbsp;&nbsp; 5 = {safe(right)}", styles["Option"]))
    for option in options or []:
        items.append(Paragraph(f"- {safe(option)}", styles["Option"]))
    if note:
        items.append(Paragraph(safe(note), styles["Help"]))
    items.append(Spacer(1, 3))
    return KeepTogether(items)


def section(title, note):
    return [Paragraph(safe(title), styles["Section"]), Paragraph(safe(note), styles["SectionNote"])]


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SurveyDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=19 * mm, rightMargin=19 * mm,
        topMargin=18 * mm, bottomMargin=20 * mm,
        title="Bricks Short Survey Questions",
        author="Bricks",
        subject="Short demand-validation survey for Google Forms",
    )

    story = [
        Spacer(1, 37 * mm),
        Paragraph("2-3 MINUTE SURVEY", styles["CoverKicker"]),
        Paragraph("Bricks: Focus and Digital Distraction Study", styles["CoverTitle"]),
        Paragraph(
            "A short, friendly survey designed to collect honest behavior and purchase signals - not polite guesses.",
            styles["CoverBody"],
        ),
        Spacer(1, 8 * mm),
        Paragraph(
            "<b>Google Forms setup:</b> Make every question required unless it is marked Optional. "
            "Use section branching for the private-beta contact section as described on the final page.",
            styles["Concept"],
        ),
        Spacer(1, 55 * mm),
        Paragraph("Prepared as a copy-ready question guide", styles["CoverBody"]),
        PageBreak(),
    ]

    story += section("Form title and introduction", "Copy this text into the title and description fields in Google Forms.")
    story += [
        Paragraph("Form title", styles["Question"]),
        Paragraph("Bricks: Focus and Digital Distraction Study", styles["Concept"]),
        Paragraph("Form description", styles["Question"]),
        Paragraph(
            "A quick, 2-3 minute reality check on phone distraction during work and study.<br/><br/>"
            "First, think about your most recent important focus session. Then you will see an early product concept called Bricks. "
            "There are no right answers - honest specifics are the useful part.<br/><br/>"
            "Bricks is an experimental Android product, not a medical device. Contact details are requested only if you ask to join the private beta.",
            styles["Concept"],
        ),
        Paragraph("Confirmation message", styles["Question"]),
        Paragraph("Done - thank you. Your honest answers are much more useful than perfect-looking ones.", styles["Concept"]),
        PageBreak(),
    ]

    story += section("Section 1 of 3 - Quick context", "Three taps, then we get to the interesting bit.")
    story += [
        question(1, "Which best describes you right now?", [
            "University student", "School or college student", "Freelancer", "Remote employee",
            "Office employee", "Business owner", "Teacher or trainer", "Other",
        ]),
        question(2, "What kind of task were you doing?", [
            "Programming or technical work", "Writing or research", "Designing or video editing",
            "University study", "Exam preparation", "Administrative or office work",
            "Client communication", "Teaching", "Other",
        ]),
        question(3, "What phone do you mainly use?", [
            "Android with NFC", "Android without NFC", "Android - not sure about NFC", "iPhone", "Other",
        ]),
        PageBreak(),
    ]

    story += section(
        "Section 2 of 3 - Your last focus session",
        "Think about your most recent important hour of work or study - not your best day and not your worst.",
    )
    story += [
        question(4, "In that hour, how many times did you open your phone without planning to?", [
            "0 times", "1-2 times", "3-5 times", "6-10 times", "More than 10 times", "Not sure",
        ]),
        question(5, "Did any quick phone check last longer than you meant it to?", [
            "No", "Yes, once", "Yes, more than once", "Not sure",
        ]),
        question(6, "After a phone check, how long did it feel like it took to get fully back into the task?", [
            "Immediately", "Less than 5 minutes", "5-15 minutes", "More than 15 minutes",
            "I did not return to the task", "Not sure",
        ], note="This is the respondent's estimate, not a measured recovery time."),
        question(7, "Which app pulled you away most?", [
            "Instagram", "TikTok", "YouTube", "WhatsApp", "Facebook", "X/Twitter", "Snapchat",
            "Games", "News", "Email", "Another app", "None during that session",
        ]),
        PageBreak(),
        *section("Section 2 continued", "Keep using the same recent focus session for Question 8."),
        question(8, "How much did phone distraction affect that session?", scale=("No effect", "A major effect")),
        question(9, "What have you relied on most to reduce phone distraction?", [
            "Do Not Disturb", "Digital Wellbeing / Screen Time", "An app blocker", "A timer or Pomodoro",
            "Putting the phone elsewhere", "Turning the phone off", "A physical focus device",
            "Nothing yet", "Something else",
        ]),
        question(10, "When you really want a blocked app, what usually happens?", [
            "I wait until the session ends", "I disable the blocker", "I use an emergency bypass",
            "I switch to another device", "I do not use a blocker", "It depends",
        ]),
        PageBreak(),
    ]

    story += section("Section 3 of 3 - Meet Bricks", "Show the concept description before asking the remaining questions.")
    story += [
        Paragraph(
            "<b>Concept description</b><br/><br/>"
            "Bricks is an early Android focus product paired with a physical NFC object. You tap the Brick to block chosen apps, then return and tap it again to unlock them.<br/><br/>"
            "It can stay on your desk or sit farther away to add a deliberate pause. Bricks does not guarantee improved productivity or health outcomes.",
            styles["Concept"],
        ),
        question(11, "Compared with a software-only blocker, how useful would the physical Brick be to you?", scale=("Much less useful", "Much more useful")),
        question(12, "If the Brick were 5-20 steps away, what would most likely happen?", [
            "I would unlock less often", "It would make no difference", "I would find it annoying but still use it",
            "I would stop using Bricks", "Not sure",
        ]),
        question(13, "Would that short walk feel useful or annoying?", [
            "Useful pause", "Mostly useful", "Neither", "Mostly annoying", "Very annoying", "It depends",
        ]),
        question(14, "Where would you realistically keep it?", [
            "On my desk", "On a nearby shelf", "Across the room", "Near the door", "In another room",
            "I would carry it", "I would not use it", "Not sure",
        ]),
        PageBreak(),
        *section("Section 3 continued", "Ask for the honest objection before discussing price."),
        question(15, "What is your biggest concern about Bricks?", [
            "Urgent access", "Losing or forgetting it", "NFC reliability", "Accessibility permission",
            "Privacy", "Battery use", "Android-only availability", "Carrying another object", "Price",
            "No major concern", "Something else",
        ]),
        question(16, "If Bricks worked reliably, how likely would you be to buy it?", scale=("Definitely would not", "Definitely would")),
        question(17, "What feels like a reasonable one-time price for the Brick and Android app?", [
            "Under Rs1,500", "Rs1,500-1,999", "Rs2,000-2,499", "Rs2,500-2,999",
            "Rs3,000-3,499", "Rs3,500 or more", "Free only", "Not sure",
        ]),
        question(18, "At a Founder price of Rs2,499 plus delivery, what is your honest reaction?", [
            "I would buy it", "I would probably buy it after testing", "I might buy it", "Probably not", "Definitely not",
        ]),
        PageBreak(),
        *section("Final questions", "No payment is collected by this survey."),
        question(19, "After a successful test, would you consider a refundable Rs1,000 reservation deposit?", [
            "Yes", "Maybe", "No",
        ], note="State clearly: this question collects no payment and creates no obligation."),
        question(20, "Would you like to test the private Android beta?", ["Yes", "Maybe later", "No"]),
        Spacer(1, 6 * mm),
        Paragraph("Private beta contact section", styles["Section"]),
        Paragraph(
            "In Google Forms, send <b>Yes</b> to this contact section. Send <b>Maybe later</b> and <b>No</b> directly to Question 21. After the contact section, continue to Question 21.",
            styles["SectionNote"],
        ),
        question("A", "Name", optional=True, note="Short answer."),
        question("B", "Email address", note="Required in this section. Use email-address validation."),
        question("C", "WhatsApp number", optional=True, note="Include country code, for example +92."),
        question("D", "Contact consent", [
            "I agree to be contacted about Bricks research, beta testing and future availability.",
        ], note="Required in this section. Use a checkbox question."),
        Spacer(1, 4 * mm),
        Paragraph("Final question for everyone", styles["Section"]),
        question(21, "One last thing: what would you change about Bricks?", optional=True, note="Paragraph response."),
    ]

    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())
