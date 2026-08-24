import zipfile, xml.etree.ElementTree as ET

xlsx_path = r"d:\Abel paginas\liberriaQR\libreriasQR\panels\Info alimentacion bot\muestra lista de precios sin iva.xlsx"

with zipfile.ZipFile(xlsx_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in tree.findall('.//main:si', ns):
            t_elem = si.find('.//main:t', ns)
            if t_elem is not None and t_elem.text:
                shared_strings.append(t_elem.text)
            else:
                text_parts = [elem.text for elem in si.findall('.//main:t', ns) if elem.text]
                shared_strings.append(''.join(text_parts))

    sheet_xml = z.read('xl/worksheets/sheet1.xml')
    sheet_tree = ET.fromstring(sheet_xml)
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    rows = []
    for row_elem in sheet_tree.findall('.//main:row', ns):
        row_data = []
        for cell in row_elem.findall('main:c', ns):
            cell_type = cell.get('t')
            v_elem = cell.find('main:v', ns)
            val = ""
            if v_elem is not None and v_elem.text:
                if cell_type == 's':
                    idx = int(v_elem.text)
                    val = shared_strings[idx] if idx < len(shared_strings) else ""
                else:
                    val = v_elem.text
            row_data.append(val)
        if any(row_data):
            rows.append(row_data)

target_skus = ['047778', '047788', '018883', '015782', '046244', '047798']
print(f"Header: {rows[0]}")
for r in rows[1:]:
    if len(r) >= 6 and r[3].strip() in target_skus:
        print(f"SKU: {r[3].strip()} | Nombre: {r[4].strip()} | Col 5 (PVP): {r[5]} | Fila completa: {r}")
