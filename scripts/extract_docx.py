import sys
import zipfile
import xml.etree.ElementTree as ET

def docx_to_text(path):
    with zipfile.ZipFile(path) as z:
        with z.open('word/document.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in root.findall('.//w:p', ns):
                texts = [t.text for t in p.findall('.//w:t', ns) if t.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n\n'.join(paragraphs)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python extract_docx.py path/to/file.docx')
        sys.exit(1)
    path = sys.argv[1]
    try:
        text = docx_to_text(path)
        print(text)
    except Exception as e:
        print('ERROR:', e)
        sys.exit(2)
