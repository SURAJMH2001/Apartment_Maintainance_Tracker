from app.parsers.pdf_parser import PDFParser
from app.parsers.docx_parser import DocxParser
from app.parsers.xlsx_parser import XlsxParser

class DocumentService:
    @staticmethod
    def get_parser(file_type: str):
        if file_type == 'application/pdf':
            return PDFParser()
        elif file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return DocxParser()
        elif file_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']:
            return XlsxParser()
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
