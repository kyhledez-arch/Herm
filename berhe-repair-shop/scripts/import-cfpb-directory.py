"""Import the user-supplied CFPB 2025 list. Requires PyMuPDF, not an app dependency.
Run: PYTHONPATH=/tmp/cfpb-layout-reader python3 scripts/import-cfpb-directory.py
The resulting JSON is a dated source snapshot, not verification of current filing routes.
"""
from pathlib import Path
from urllib.request import urlopen
import json
import re
import unicodedata
import pymupdf as fitz

SOURCE = "https://files.consumerfinance.gov/f/documents/cfpb_consumer-reporting-companies_list_2025.pdf"
PDF = Path("/tmp/cfpb-2025.pdf")
if not PDF.exists():
    PDF.write_bytes(urlopen(SOURCE, timeout=45).read())
document = fitz.open(PDF)
MARKETS = {
    9: "Nationwide credit reporting", 11: "Employment screening", 21: "Tenant screening",
    26: "Banking & payments", 30: "Property insurance & driving", 35: "Medical & life insurance",
    36: "Low-income & subprime", 39: "Supplementary reports", 41: "Telecom & utilities",
    42: "Retail", 43: "Gambling & sports betting",
}
KNOWN_IDS = {
    "The Work Number": "worknumber", "Chex Systems, Inc.": "chexsystems",
    "Early Warning Services, LLC": "earlywarning", "DataX, Ltd.": "datax",
    "Innovis": "innovis", "LexisNexis Risk Solutions": "lexisnexis",
}

def clean(text):
    text = unicodedata.normalize("NFKC", text).replace("\u00ad", "")
    text = re.sub(r"[\uf000-\uf8ff]", "", text)
    return re.sub(r"\s+", " ", text).strip()

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def lines_in(page, lower, upper, side):
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = [span for span in line["spans"] if span["size"] >= 9 and (span["bbox"][0] < 320) == (side == "left") and lower <= span["bbox"][1] < min(upper, 715)]
            text = clean("".join(span["text"] for span in spans))
            if text and re.search(r"[A-Za-z0-9]", text):
                lines.append((min(span["bbox"][1] for span in spans), min(span["bbox"][0] for span in spans), text))
    return [text for _, _, text in sorted(lines)]

records = []
market = None
for number, page in enumerate(document, 1):
    if number < 9:
        continue
    market = MARKETS.get(number, market)
    headings = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = [span for span in line["spans"] if span["font"] == "ArialMT" and abs(span["size"] - 14) < 0.2 and span["bbox"][0] < 320]
            text = clean("".join(span["text"] for span in spans))
            if text:
                y = min(span["bbox"][1] for span in spans)
                if headings and y - headings[-1]["last"] < 42:
                    headings[-1]["name"] += " " + text
                    headings[-1]["last"] = y
                else:
                    headings.append({"name": text, "y": y, "last": y})
    for index, heading in enumerate(headings):
        bottom = headings[index + 1]["y"] - 4 if index + 1 < len(headings) else 740
        left = lines_in(page, heading["last"] + 15, bottom, "left")
        right = lines_in(page, heading["y"] - 4, bottom, "right")
        if number == 9:
            left = ["These are the three big nationwide providers of consumer reports.", "Free weekly report:", "Since the COVID-19 pandemic, you can request your credit reports for free weekly from each of these companies.", "Freeze your report:", "The nationwide companies offer security freezes; contact each bureau separately."]
            right = lines_in(page, heading["y"] - 4, 340, "right")
        desc, report, freeze = [], [], []
        state = "description"
        for line in left:
            if re.match(r"^Free (?:weekly )?report(?: and score)?:$", line, re.I):
                state = "report"
                continue
            if re.match(r"^Freeze your report:$", line, re.I):
                state = "freeze"
                continue
            {"description": desc, "report": report, "freeze": freeze}[state].append(line)
        sections = {"website": [], "phone": [], "address": []}
        key = None
        for line in right:
            if line.lower() in sections:
                key = line.lower()
            elif key:
                sections[key].append(line)
        links = []
        for link in page.get_links():
            rectangle = link["from"]
            uri = link.get("uri", "")
            if not uri or rectangle.height <= 0 or not heading["y"] - 4 <= rectangle.y0 < bottom:
                continue
            if not re.match(r"^(?:https?://|mailto:)", uri):
                continue
            label = clean(page.get_textbox(rectangle + (-0.5, -0.5, 0.5, 0.5)))
            label = re.sub(r"^Website\s*", "", label).strip()
            item = {"label": label or "Provider resource", "url": uri}
            if not any(item["url"] == previous["url"] for previous in links):
                links.append(item)
        contact_links = []
        for link in page.get_links():
            rectangle = link["from"]
            uri = link.get("uri", "")
            if uri.startswith(("https://", "http://")) and rectangle.x0 >= 320 and rectangle.height > 0 and heading["y"] - 4 <= rectangle.y0 < bottom:
                if uri not in contact_links:
                    contact_links.append(uri)
        website = contact_links[0] if contact_links else ""
        if not website and sections["website"]:
            candidate = re.search(r"[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^ ]*)?", sections["website"][0])
            if candidate:
                website = "https://" + candidate.group(0)
        report_link = next((link["url"] for link in links if "report" in link["label"].lower() or "registration" in link["label"].lower()), website)
        freeze_link = next((link["url"] for link in links if "freeze" in link["label"].lower()), website)
        name = heading["name"]
        record = {
            "id": KNOWN_IDS.get(name, "cfpb-" + slug(name)), "name": name, "market": market,
            "description": " ".join(desc), "reportPolicy": " ".join(report),
            "freezeListed": bool(freeze), "freezePolicy": " ".join(freeze),
            "website": website, "reportUrl": report_link, "freezeUrl": freeze_link if freeze else "",
            "phoneText": "\n".join(sections["phone"]), "address": "\n".join(sections["address"]),
            "links": links, "sourcePage": number, "sourceYear": 2025,
        }
        if number == 9:
            for bureau in ["equifax", "transunion", "experian"]:
                copy = dict(record)
                copy.update({"id": bureau, "name": bureau.capitalize() if bureau != "transunion" else "TransUnion", "sourceEntry": name, "address": "Central Source, LLC\nP.O. Box 105283\nAtlanta, GA 30348-5283", "contactNote": "AnnualCreditReport.com contact for report requests only—not a dispute or freeze mailing address."})
                records.append(copy)
        else:
            records.append(record)
assert len({record["id"] for record in records}) == len(records), "Duplicate directory IDs"
assert all(record["name"] and record["market"] and record["website"] for record in records), "Missing company fields"
assert len(records) == 64, f"Unexpected company count: {len(records)}"
assert all(record["reportPolicy"] for record in records), "Missing report policy"
assert not any("LIST OF CONSUMER" in str(record) for record in records), "Footer text in a record"
output = Path("src/lib/data/cfpb-companies-2025.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
print(f"Imported {len(records)} company listings across {len(set(record['market'] for record in records))} markets.")
for record in records:
    print(f"p{record['sourcePage']:02d} | {record['market']} | {record['name']} | report: {bool(record['reportPolicy'])} | freeze: {record['freezeListed']} | {record['website']}")
