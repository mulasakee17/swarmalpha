from pathlib import Path
import build_outputs as b

root = Path(__file__).resolve().parent
b.SRC = root / "final_paper" / "aamas_cut.zh.md"
b.DOCX = root / "final_paper" / "aamas_cut.zh.docx"
b.PDF = root / "final_paper" / "aamas_cut.zh.pdf"
b.TEX = root / "final_paper" / "aamas_cut.main.tex"

text = b.SRC.read_text(encoding="utf-8")
parts = b.blocks(text)
b.build_docx(parts)
b.build_pdf(parts)
b.build_tex(text)
print(b.DOCX, b.PDF, b.TEX)
