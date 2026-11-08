from pathlib import Path

f = Path("c:/Users/nemol/OneDrive/Desktop/agri/src/pages/VoiceAssistant.jsx")
# Read with errors='replace' to preserve bytes and not fail on cp1252 em-dashes
code = f.read_text(encoding="latin-1")

old_labels = """  lac_suitability:   { label:'Lac Suitability',         route:'/lac',                 color:'#2d6a4f' },
  lac_forecast:      { label:'Lac Forecast',            route:'/lac',                 color:'#2d6a4f' },
  lac_history:       { label:'Lac Historical Data',     route:'/lac',                 color:'#2d6a4f' },"""

new_labels = """  lac_suitability:   { label:'Lac Suitability',         route:'/lac',                 color:'#2d6a4f' },
  lac_forecast:      { label:'Lac Production Forecast', route:'/lac',                 color:'#2d6a4f' },
  lac_risk:          { label:'Lac Environmental Risk',  route:'/lac',                 color:'#b87c1a' },
  lac_calendar:      { label:'Lac Crop Calendar',       route:'/lac',                 color:'#2d6a4f' },
  lac_market:        { label:'Lac Market & Profit',     route:'/lac',                 color:'#1a5c6e' },
  lac_history:       { label:'Lac Historical Trends',   route:'/lac',                 color:'#2d6a4f' },
  lac_guidance:      { label:'Lac Cultivation Guidance',route:'/lac',                 color:'#2d6a4f' },"""

if old_labels in code:
    code = code.replace(old_labels, new_labels, 1)
    f.write_text(code, encoding="latin-1")
    print("VoiceAssistant.jsx MODULE_LABELS updated!")
else:
    old_crlf = old_labels.replace('\n', '\r\n')
    new_crlf = new_labels.replace('\n', '\r\n')
    assert old_crlf in code, "old_labels not found in VoiceAssistant.jsx!"
    code = code.replace(old_crlf, new_crlf, 1)
    f.write_text(code, encoding="latin-1")
    print("VoiceAssistant.jsx MODULE_LABELS updated with CRLF!")
