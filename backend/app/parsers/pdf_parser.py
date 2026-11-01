"""PDF parser - extracts transactions from PDF files using pdfplumber."""
import re
from typing import List
from datetime import datetime

import pdfplumber

from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction


class PDFParser(AbstractParser):
    """
    Parses PDF documents for transaction data.
    Supports both table-based PDFs and text-based PDFs.
    """

    # Patterns: date formats dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
    DATE_PATTERNS = [
        re.compile(r"(\d{2}/\d{2}/\d{4})"),
        re.compile(r"(\d{2}-\d{2}-\d{4})"),
        re.compile(r"(\d{4}-\d{2}-\d{2})"),
    ]
    DATE_FORMATS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"]

    # Amount: optional currency symbol, digits with optional commas, optional decimals
    AMOUNT_PATTERN = re.compile(r"[₹\$]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)")

    def _parse_date_from_line(self, line: str) -> datetime | None:
        """Try multiple date patterns on a line."""
        for pattern, fmt in zip(self.DATE_PATTERNS, self.DATE_FORMATS):
            m = pattern.search(line)
            if m:
                try:
                    return datetime.strptime(m.group(1), fmt)
                except ValueError:
                    continue
        return None

    def _parse_amount(self, line: str) -> float | None:
        """Extract the largest numeric amount from a line."""
        matches = self.AMOUNT_PATTERN.findall(line)
        amounts = []
        for m in matches:
            try:
                amounts.append(float(m.replace(",", "")))
            except ValueError:
                continue
        return max(amounts) if amounts else None

    def _guess_type(self, line: str) -> str:
        """Heuristically determine if a transaction is income or expense."""
        lower = line.lower()
        expense_keywords = ["expense", "paid", "payment", "repair", "utility", "salary", "debit", "dr"]
        income_keywords = ["income", "received", "maintenance", "credit", "cr", "collected"]
        for kw in expense_keywords:
            if kw in lower:
                return "expense"
        for kw in income_keywords:
            if kw in lower:
                return "income"
        return "income"

    def _guess_category(self, line: str) -> str:
        """Heuristically determine transaction category."""
        lower = line.lower()
        if any(w in lower for w in ["repair", "fix", "maintenance work"]):
            return "repair"
        if any(w in lower for w in ["electricity", "water", "gas", "utility"]):
            return "utility"
        if any(w in lower for w in ["salary", "wage", "staff"]):
            return "salary"
        if any(w in lower for w in ["maintenance", "society"]):
            return "maintenance"
        return "other"

    def _parse_tables(self, pdf) -> List[ParsedTransaction]:
        """Try extracting from structured tables first."""
        transactions = []
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue
                headers = [str(h).lower().strip() if h else "" for h in table[0]]
                for row in table[1:]:
                    if not row or not any(row):
                        continue
                    row_text = " ".join(str(c) if c else "" for c in row)
                    dt = self._parse_date_from_line(row_text)
                    amt = self._parse_amount(row_text)
                    if dt and amt and amt > 0:
                        transactions.append(
                            ParsedTransaction(
                                transaction_date=dt,
                                amount=amt,
                                transaction_type=self._guess_type(row_text),
                                category=self._guess_category(row_text),
                                description=row_text[:200],
                                reference_number=None,
                                resident_unit=None,
                            )
                        )
        return transactions

    def parse(self, file_path: str) -> List[ParsedTransaction]:
        """Parse PDF file and return extracted transactions."""
        transactions: List[ParsedTransaction] = []

        with pdfplumber.open(file_path) as pdf:
            # Try table extraction first
            table_txns = self._parse_tables(pdf)
            if table_txns:
                return table_txns

            # Fallback: line-by-line text parsing
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                for line in text.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    dt = self._parse_date_from_line(line)
                    amt = self._parse_amount(line)
                    if dt and amt and amt > 0:
                        try:
                            transactions.append(
                                ParsedTransaction(
                                    transaction_date=dt,
                                    amount=amt,
                                    transaction_type=self._guess_type(line),
                                    category=self._guess_category(line),
                                    description=line[:200],
                                    reference_number=None,
                                    resident_unit=None,
                                )
                            )
                        except Exception:
                            continue

        return transactions
