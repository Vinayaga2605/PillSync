import csv
import io

from fastapi.responses import StreamingResponse

from openpyxl import Workbook

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Table
from reportlab.platypus import TableStyle
from reportlab.platypus import Paragraph
from reportlab.platypus import Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT


def csv_response(headers, rows, filename):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.csv"'
        },
    )


def xlsx_response(headers, rows, filename):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = filename.replace("_", " ")[:31]

    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.xlsx"'
        },
    )


def export_response(fmt, headers, rows, filename):
    if fmt == "csv":
        return csv_response(headers, rows, filename)
    if fmt == "xlsx":
        return xlsx_response(headers, rows, filename)
    if fmt == "pdf":
        return pdf_response(headers, rows, filename)

    raise ValueError("Unsupported export format")


def pdf_response(headers, rows, filename):
    buffer = io.BytesIO()

    page = landscape(A4) if len(headers) > 5 else A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    title_style.alignment = TA_LEFT

    story = [
        Paragraph(f"PillSync - {filename.replace('_', ' ').title()}", title_style),
        Spacer(1, 10),
    ]

    table_data = [headers]
    for row in rows:
        table_data.append([str(cell) if cell is not None else "" for cell in row])

    width = page[0] - inch
    col_width = width / max(len(headers), 1)

    table = Table(table_data, colWidths=[col_width] * len(headers), repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                    colors.white,
                    colors.HexColor("#f0fdfa"),
                ]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    story.append(table)
    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.pdf"'
        },
    )
