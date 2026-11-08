# -*- coding: utf-8 -*-
import glob
import os

files = glob.glob('src/components/loss/*.jsx')
for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    changed = False
    if 'useLanguage' not in text:
        text = "import { useLanguage } from '../../context/LanguageContext'\n" + text
        changed = True

    # Inject const { t } = useLanguage() into the default export function
    # e.g. export default function Foo({ ... }) {
    lines = text.split('\n')
    new_lines = []
    for line in lines:
        new_lines.append(line)
        if line.strip().startswith('export default function') and '{' in line:
            new_lines.append("  const { t } = useLanguage()")
            changed = True
        elif line.strip().startswith('function DataBadge(') and '{' in line:
            new_lines.append("  const { t } = useLanguage()")
            changed = True

    text = '\n'.join(new_lines)

    # Replace common static patterns
    replacements = [
        ('title="Farm Location"', 'title={t("Farm Location")}'),
        ('title="Crop Details"', 'title={t("Crop Details")}'),
        ('title="Incident & Damage Details"', 'title={t("Incident & Damage Details")}'),
        ('title="Insurance & Farmer Details"', 'title={t("Insurance & Farmer Details")}'),
        ('title="Production Loss Estimate"', 'title={t("Production Loss Estimate")}'),
        ('title="Weather Evidence"', 'title={t("Weather Evidence")}'),
        ('title="Flood Evidence"', 'title={t("Flood Evidence")}'),
        ('title="Growth Stage at Incident"', 'title={t("Growth Stage at Incident")}'),
        ('title="Financial Loss Summary"', 'title={t("Financial Loss Summary")}'),
        ('title="AGMARKNET Market Prices"', 'title={t("AGMARKNET Market Prices")}'),
        ('title="PMFBY Insurance Eligibility"', 'title={t("PMFBY Insurance Eligibility")}'),
        ('title="Document Checklist"', 'title={t("Document Checklist")}'),
        ('title="Agronomic Recovery Actions"', 'title={t("Agronomic Recovery Actions")}'),
        ('title="Financial Support Options"', 'title={t("Financial Support Options")}'),
        ('title="Claims Log"', 'title={t("Claims Log")}'),
        ('title="Official Resources"', 'title={t("Official Resources")}'),
        ('label: \'MEASURED DATA\'', 'label: t(\'MEASURED DATA\')'),
        ('label: \'CALCULATED\'', 'label: t(\'CALCULATED\')'),
        ('label: \'ESTIMATED\'', 'label: t(\'ESTIMATED\')'),
        ('label: \'DATA UNAVAILABLE\'', 'label: t(\'DATA UNAVAILABLE\')'),
        ('<span>{text}</span>', '<span>{t(text, text)}</span>'),
        ('<b>{title}</b>', '<b>{t(title, title)}</b>'),
    ]

    for old_s, new_s in replacements:
        if old_s in text:
            text = text.replace(old_s, new_s)
            changed = True

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Patched {file_path}")

print("All loss components processed")

