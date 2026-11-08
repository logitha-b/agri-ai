with open('src/context/LanguageContext.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

dom_walker_code = """
  // Automatic DOM text node localizer for all module contents
  useEffect(() => {
    if (!language || language === 'en') {
      return
    }

    const pDict = phraseTranslations[language] || {}
    const sortedPhrases = Object.entries(pDict)
      .filter(([enKey, localizedVal]) => enKey && localizedVal && enKey !== localizedVal && enKey.length > 1)
      .sort((a, b) => b[0].length - a[0].length)

    const localizeNode = (node) => {
      if (node.nodeType === 3) {
        const val = node.nodeValue
        if (!val || !val.trim()) return

        // Skip if already contains non-Latin Indic script characters
        if (/[\\u0900-\\u0D7F]/.test(val)) return

        const parent = node.parentElement
        if (!parent) return
        const tag = parent.tagName.toLowerCase()
        if (tag === 'code' || tag === 'pre' || tag === 'script' || tag === 'style') {
          return
        }

        let currentVal = val
        let modified = false

        for (const [enPhrase, replacement] of sortedPhrases) {
          if (currentVal.toLowerCase().includes(enPhrase.toLowerCase())) {
            const regex = new RegExp(enPhrase.replace(/[.*+?^${}()|[\\]\\\\\\/]/g, '\\\\$&'), 'gi')
            currentVal = currentVal.replace(regex, replacement)
            modified = true
          }
        }

        if (modified && node.nodeValue !== currentVal) {
          node.nodeValue = currentVal
        }
      } else if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase()
        if (tag === 'code' || tag === 'pre' || tag === 'script' || tag === 'style') {
          return
        }
        for (let i = 0; i < node.childNodes.length; i++) {
          localizeNode(node.childNodes[i])
        }
      }
    }

    const walk = () => {
      const root = document.querySelector('.route-content') || document.querySelector('.app-shell') || document.body
      if (root) localizeNode(root)
    }

    walk()
    const timer = setTimeout(walk, 150)
    const timer2 = setTimeout(walk, 500)

    const observer = new MutationObserver(() => {
      walk()
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      observer.disconnect()
    }
  }, [language])
"""

insert_pos = code.find('return (\n    <LanguageContext.Provider')
if insert_pos != -1:
    code = code[:insert_pos] + dom_walker_code + "\n  " + code[insert_pos:]

with open('src/context/LanguageContext.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("LanguageContext.jsx updated with non-invasive Indic DOM auto-localizer!")

