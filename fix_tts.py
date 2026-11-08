with open('src/pages/VoiceAssistant.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix bold: **text** -> text
old1 = "  t = t.replace(/\\*\\*(.+?)\\*\\*/g, '')"
new1 = "  t = t.replace(/\\*\\*(.+?)\\*\\*/g, '$1')"
content = content.replace(old1, new1, 1)

# Fix italic: *text* -> text
old2 = "  t = t.replace(/\\*(.+?)\\*/g, '')"
new2 = "  t = t.replace(/\\*(.+?)\\*/g, '$1')"
content = content.replace(old2, new2, 1)

# Fix backtick: broken regex -> proper one
old3 = "  t = t.replace(/([^]+)/g, '')"
new3 = "  t = t.replace(/`([^`]+)`/g, '$1')"
content = content.replace(old3, new3, 1)

with open('src/pages/VoiceAssistant.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done. Checking result:')
lines = content.split('\n')
for i, ln in enumerate(lines[97:106], start=98):
    print(f'{i}: {ln}')
