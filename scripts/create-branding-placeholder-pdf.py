from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas


OUTPUT = "public/pranavi-ram-branding.pdf"
WIDTH = 1600
HEIGHT = 900


pdf = canvas.Canvas(OUTPUT, pagesize=(WIDTH, HEIGHT))
pdf.setTitle("Pranavi Ram - Branding")
pdf.setAuthor("Pranavi Ram")
pdf.setFillColor(HexColor("#123C45"))
pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)

pdf.setFillColor(HexColor("#82A6A6"))
pdf.setFont("Times-Bold", 88)
pdf.drawCentredString(WIDTH / 2, HEIGHT / 2 + 34, "Pranavi Ram - Branding")

pdf.setFont("Helvetica", 23)
pdf.drawCentredString(
    WIDTH / 2,
    HEIGHT / 2 - 42,
    "Interactive deck available at pranaviram.com/branding/",
)

pdf.setFont("Helvetica", 15)
pdf.setFillAlpha(0.8)
pdf.drawCentredString(WIDTH / 2, 62, "Placeholder PDF - full export forthcoming")
pdf.save()
