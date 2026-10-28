#!/usr/bin/env python3
"""Genera docs/modelo-de-datos.generado.md (diccionario + diagrama ER) desde schema.prisma.
Uso: python3 scripts/docs/gen-data-dictionary.py"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
schema = (ROOT / 'apps/api/prisma/schema.prisma').read_text(encoding='utf-8')

enums = {m.group(1): re.findall(r'^\s+([A-Z_]+)\s*$', m.group(2), re.M)
         for m in re.finditer(r'^enum (\w+) \{(.*?)^\}', schema, re.M | re.S)}
models = []
for m in re.finditer(r'^model (\w+) \{(.*?)^\}', schema, re.M | re.S):
    name, body = m.group(1), m.group(2)
    table = re.search(r'@@map\("(\w+)"\)', body)
    fields, rels, idx = [], [], []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        if line.startswith('@@'):
            if line.startswith(('@@index', '@@unique', '@@id')):
                idx.append(line)
            continue
        parts = line.split(None, 2)
        if len(parts) < 2:
            continue
        fname, ftype = parts[0], parts[1]
        attrs = parts[2] if len(parts) > 2 else ''
        base = ftype.rstrip('?[]')
        is_model = re.search(rf'^model {re.escape(base)} \{{', schema, re.M) is not None
        if is_model:
            rm = re.search(r'@relation\([^)]*fields:\s*\[(\w+)\]', attrs)
            if rm:
                rels.append((base, fname, rm.group(1), ftype.endswith('?')))
            continue
        col = re.search(r'@map\("(\w+)"\)', attrs)
        db = re.search(r'@db\.(\w+(?:\([^)]*\))?)', attrs)
        default = re.search(r'@default\(((?:[^()]|\([^)]*\))*)\)', attrs)
        flags = []
        if '@id' in attrs: flags.append('PK')
        if '@unique' in attrs: flags.append('único')
        if '@updatedAt' in attrs: flags.append('auto (actualización)')
        comment = attrs.split('//', 1)[1].strip() if '//' in attrs else ''
        fields.append({
            'name': fname, 'col': col.group(1) if col else fname, 'type': base + (f' ({db.group(1)})' if db else ''),
            'null': ftype.endswith('?'), 'list': ftype.endswith('[]'), 'default': default.group(1) if default else '',
            'flags': ', '.join(flags), 'enum': base in enums, 'comment': comment,
        })
    models.append({'name': name, 'table': table.group(1) if table else name, 'fields': fields, 'rels': rels, 'idx': idx})

out = ['# Modelo de datos (generado)', '',
       '> Archivo generado por `scripts/docs/gen-data-dictionary.py` a partir de `apps/api/prisma/schema.prisma`. No editar a mano.',
       f'> {len(models)} tablas · {len(enums)} enumeraciones. Las restricciones CHECK, índices parciales y el trigger del libro contable están en la migración inicial (ver `modelo-de-datos.md`).', '',
       '## Diagrama entidad-relación', '', '```mermaid', 'erDiagram']
for mdl in models:
    for target, fname, fk, optional in mdl['rels']:
        card = '|o--o{' if optional else '||--o{'
        out.append(f'    {target} {card} {mdl["name"]} : "{fname}"')
out += ['```', '', '## Diccionario de datos', '']
for mdl in models:
    out += [f'### {mdl["name"]} → `{mdl["table"]}`', '', '| Campo | Columna | Tipo | Nulo | Por defecto | Notas |', '|---|---|---|---|---|---|']
    for f in mdl['fields']:
        notes = ', '.join(x for x in [f['flags'], ('enum: ' + ' / '.join(enums[f['type'].split(' ')[0]])) if f['enum'] else '', 'lista' if f['list'] else '', f['comment']] if x)
        out.append(f"| {f['name']} | `{f['col']}` | {f['type']} | {'sí' if f['null'] else 'no'} | {f['default'].replace('|', '/') or ''} | {notes} |")
    if mdl['rels']:
        out.append('')
        out.append('Relaciones: ' + '; '.join(f'`{fk}` → {t}' for t, _, fk, _ in mdl['rels']))
    if mdl['idx']:
        out.append('')
        out.append('Índices: ' + '; '.join(f'`{i}`' for i in mdl['idx']))
    out.append('')
(ROOT / 'docs/modelo-de-datos.generado.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('docs/modelo-de-datos.generado.md:', len(models), 'modelos')
