"""XLSX/XLS parser - uses openpyxl directly (no pandas dependency)."""
import re
from typing import List
from datetime import datetime, date
from openpyxl import load_workbook

from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction


class XlsxParser(AbstractParser):
    """
    Parses XLSX files for transactions.

    Expected columns (case-insensitive, flexible matching):
      date, amount, type (income/expense), category, description, reference, unit
    """

    COLUMN_ALIASES = {
        "date": ["date", "transaction_date", "txn_date", "payment_date"],
        "amount": ["amount", "total", "value", "sum"],
        "type": ["type", "transaction_type", "txn_type", "kind"],
        "category": ["category", "cat", "head"],
        "description": ["description", "desc", "narration", "remarks", "note", "notes"],
        "reference": ["reference", "ref", "cheque", "utr", "reference_number"],
        "unit": ["unit", "unit_number", "flat", "apartment"],
    }

    def _find_column(self, headers: List[str], field: str) -> int | None:
        """Find column index for a field using alias matching."""
        lower_headers = [h.lower().strip() if h else "" for h in headers]
        for alias in self.COLUMN_ALIASES.get(field, []):
            if alias in lower_headers:
                return lower_headers.index(alias)
        return None

    def _parse_date(self, value) -> datetime | None:
        """Try to parse various date formats."""
        if isinstance(value, (datetime, date)):
            if isinstance(value, date) and not isinstance(value, datetime):
                return datetime(value.year, value.month, value.day)
            return value if isinstance(value, datetime) else datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d.%m.%Y"]:
                try:
                    return datetime.strptime(value.strip(), fmt)
                except ValueError:
                    continue
        return None

    def parse(self, file_path: str) -> List[ParsedTransaction]:
        """Parse the xlsx file and return a list of ParsedTransaction."""
        transactions: List[ParsedTransaction] = []

        try:
            wb = load_workbook(file_path, read_only=True, data_only=True)
        except Exception:
            return transactions

        for sheet in wb.worksheets:
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue

            # Find header row (first non-empty row)
            header_row_idx = 0
            for i, row in enumerate(rows):
                if any(cell for cell in row):
                    header_row_idx = i
                    break

            headers = [str(c) if c is not None else "" for c in rows[header_row_idx]]

            # Map column indices
            col = {field: self._find_column(headers, field) for field in self.COLUMN_ALIASES}

            for row in rows[header_row_idx + 1:]:
                if not any(row):
                    continue
                try:
                    # Date
                    date_val = row[col["date"]] if col["date"] is not None and col["date"] < len(row) else None
                    parsed_date = self._parse_date(date_val)
                    if not parsed_date:
                        continue

                    # Amount
                    amt_val = row[col["amount"]] if col["amount"] is not None and col["amount"] < len(row) else None
                    if amt_val is None:
                        continue
                    try:
                        amount = float(str(amt_val).replace(",", "").replace("₹", "").replace("$", "").strip())
                    except (ValueError, TypeError):
                        continue

                    # Optional fields
                    def safe_str(idx):
                        if idx is not None and idx < len(row) and row[idx] is not None:
                            return str(row[idx]).strip()
                        return None

                    txn_type = safe_str(col["type"]) or "income"
                    if txn_type.lower() not in ("income", "expense"):
                        txn_type = "income"

                    category = safe_str(col["category"]) or "maintenance"
                    description = safe_str(col["description"]) or ""
                    reference = safe_str(col["reference"])
                    unit = safe_str(col["unit"])

                    transactions.append(
                        ParsedTransaction(
                            transaction_date=parsed_date,
                            amount=amount,
                            transaction_type=txn_type.lower(),
                            category=category.lower(),
                            description=description,
                            reference_number=reference,
                            resident_unit=unit,
                        )
                    )
                except Exception:
                    continue

        return transactions
