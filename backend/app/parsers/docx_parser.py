import docx
import re
from typing import List
from datetime import datetime
from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction

class DocxParser(AbstractParser):
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        doc = docx.Document(file_path)
        transactions = []
        date_pattern = re.compile(r"(\d{2}/\d{2}/\d{4})")
        amount_pattern = re.compile(r"\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))")
        
        for para in doc.paragraphs:
            line = para.text
            date_match = date_pattern.search(line)
            amount_match = amount_pattern.search(line)
            if date_match and amount_match:
                try:
                    dt = datetime.strptime(date_match.group(1), "%d/%m/%Y")
                    amt = float(amount_match.group(1).replace(",", ""))
                    transactions.append(ParsedTransaction(
                        transaction_date=dt,
                        amount=amt,
                        transaction_type="income",
                        category="other",
                        description=line,
                        reference_number=None,
                        resident_unit=None
                    ))
                except Exception:
                    pass
        return transactions
