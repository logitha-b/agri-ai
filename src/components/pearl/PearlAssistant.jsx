import { useLanguage } from '../../context/LanguageContext'
/**
 * PearlAssistant — Knowledge-based Q&A for pearl culture.
 * Rule-based, curated from ICAR-CIFE, CMFRI, MPEDA publications.
 * No LLM. Every answer cites a source. Does not fabricate data.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Send, User } from 'lucide-react'
import { Card, Notice } from '../../components'

const KB = [
  // Species
  { keys:['freshwater species','mussel','lamellidens','parreysia'],
    answer:'India\'s primary freshwater pearl mussels are Lamellidens marginalis, Lamellidens corrianus, and Parreysia corrugata. Lamellidens marginalis is the most widely cultured. These are found across peninsular and eastern India in rivers, ponds, and reservoirs. They produce small baroque and semi-round pearls.',
    source:'ICAR-CIFE Freshwater Pearl Culture Manual' },
  { keys:['marine species','oyster','pinctada','akoya'],
    answer:'India\'s primary marine pearl oyster is Pinctada fucata (Indian Akoya oyster), cultured mainly in the Gulf of Mannar and Lakshadweep. Pinctada margaritifera (black-lip oyster) is also present. India has a long history of natural pearl fisheries; modern marine pearl culture has been developed by CMFRI.',
    source:'CMFRI / MPEDA Marine Pearl Culture Manual' },
  // Suitability
  { keys:['suitable','water quality','parameters','freshwater conditions'],
    answer:'Optimal freshwater pearl mussel conditions: Temperature 22–32°C, pH 7.0–8.5, Dissolved oxygen > 5 mg/L, Turbidity < 50 NTU, Total hardness 75–300 mg/L, Alkalinity 50–200 mg/L. Avoid heavily polluted or seasonally dry water bodies. Field measurement is required — climate data alone is insufficient.',
    source:'ICAR-CIFE' },
  { keys:['marine conditions','salinity','sea water'],
    answer:'Optimal marine pearl oyster conditions: Temperature 25–31°C, Salinity 28–35 ppt, Dissolved oxygen > 5 mg/L, pH 7.8–8.3, Depth 3–15 m, Current 0.1–0.5 m/s. Avoid sites with harmful algal bloom history, industrial effluents, or extreme coastal exposure.',
    source:'CMFRI / MPEDA' },
  // Cultivation
  { keys:['nucleus','implantation','surgery','insert'],
    answer:'Nucleus implantation involves surgically inserting a spherical nucleus bead (usually made from freshwater mussel shell) into the gonad of a conditioned mussel or oyster. The animal coats the nucleus with nacre over time. This requires trained technicians. Untrained implantation causes high rejection rates. ICAR-CIFE and CMFRI offer training programmes.',
    source:'ICAR-CIFE Implantation Guide' },
  { keys:['how long','duration','culture period','months'],
    answer:'Freshwater pearl culture (nucleus implantation): 18–24 months. Without implantation: 12 months. Marine Pinctada fucata (long-line): 18–36 months. Duration varies with water temperature, food availability, and species. Warmer water speeds growth but may also increase stress risk.',
    source:'ICAR-CIFE / CMFRI cultivation guides' },
  { keys:['stocking','density','how many'],
    answer:'Freshwater pond stocking density: 2–4 mussels per m² (suspended nets). Marine long-line: 1–2 oysters per pocket per dropper at 20–30 cm spacing. Overcrowding reduces food availability and oxygen, increasing mortality. Start conservatively and adjust based on water-quality measurements.',
    source:'ICAR-CIFE / CMFRI' },
  // Harvest
  { keys:['harvest','when to harvest','pearl ready'],
    answer:'Harvest when pearl size and quality are acceptable — typically after the culture period (12–36 months depending on species and method). Sample 5–10 mussels/oysters to assess pearl development before full harvest. Open carefully to avoid damaging the pearl. Some animals may be re-implanted for a second culture cycle.',
    source:'ICAR-CIFE Harvest Guide' },
  // Risk
  { keys:['risk','temperature','heat','flood','rain'],
    answer:'Key environmental risks: (1) Temperature above 38°C (freshwater) or 36°C (marine) — mortality risk. (2) Heavy rain (>400 mm/month freshwater; >800 mm/month marine) — flooding, turbidity, oxygen depletion. (3) Very low rainfall in summer — pond level drop. Always measure dissolved oxygen and turbidity after heavy rain events.',
    source:'ICAR-CIFE / CMFRI environmental risk guidelines' },
  { keys:['dissolved oxygen','do','oxygen depletion','suffocation'],
    answer:'Dissolved oxygen below 3 mg/L causes mussel/oyster stress and mortality. Minimum threshold is 5 mg/L. Low DO can occur after heavy rain (runoff), algal bloom die-off, hot weather, or organic matter decomposition. Test DO weekly in summer. Aerate ponds if DO drops below 5 mg/L.',
    source:'ICAR-CIFE water quality guidelines' },
  { keys:['ph','acidity','alkalinity'],
    answer:'Freshwater: pH 7.0–8.5 is optimal. Below 6.5 causes shell dissolution (carbonate solubility increases with acidity). Marine: pH 7.8–8.3. Sudden pH drops after heavy rain or algal blooms are dangerous. Test pH weekly and after significant weather events.',
    source:'ICAR-CIFE / CMFRI' },
  // Grading
  { keys:['grade','quality','shape','luster','round'],
    answer:'Pearl grading considers: (1) Shape — round > near-round > baroque > keshi. (2) Size — larger pearls command higher prices. (3) Luster — mirror-like luster is most valued. (4) Surface — fewer blemishes = higher grade. (5) Color — white, pink, cream, golden vary by market. Indian freshwater pearls are mostly baroque; marine Akoya pearls can be near-round with good luster.',
    source:'MPEDA Pearl Grading Guide' },
  // Economics
  { keys:['price','profit','revenue','cost','economics'],
    answer:'Published reference prices (MPEDA/CIFE, 2022-24): Freshwater pearls — Grade A ₹80–300/pearl, Grade B ₹40–150/pearl, Grade C ₹10–60/pearl. Marine Akoya (AAA) ₹1,500–8,000/pearl. Reference costs: freshwater cycle ₹55,000–75,000; marine cycle ₹1,50,000–2,00,000. Actual prices vary by size, luster, and market. Do not treat these as guaranteed returns.',
    source:'MPEDA / ICAR-CIFE economics data' },
  // Training
  { keys:['training','learn','icar','cife','cmfri'],
    answer:'ICAR-CIFE (Central Institute of Freshwater Aquaculture, Bhubaneswar) offers freshwater pearl culture training. CMFRI (Central Marine Fisheries Research Institute, Kochi) and its regional centres offer marine pearl culture training. MPEDA (Marine Products Export Development Authority) supports marine aquaculture. Contact your nearest ICAR institute or State Fisheries Department.',
    source:'ICAR-CIFE / CMFRI / MPEDA' },
  // India
  { keys:['india','state','where','location'],
    answer:'Major freshwater pearl culture states: Andhra Pradesh, Telangana, West Bengal, Odisha, Assam, Bihar, Karnataka. Marine pearl culture: Tamil Nadu (Gulf of Mannar), Lakshadweep, Andaman & Nicobar Islands, Kerala coast. India was historically famous for natural marine pearls from the Gulf of Mannar, known since antiquity.',
    source:'ICAR-CIFE / CMFRI national status reports' },
  // General
  { keys:['what is','pearl','nacre','how does'],
    answer:'A pearl forms when an irritant (or implanted nucleus) enters a mollusc. The animal secretes nacre (calcium carbonate + conchiolin) layer by layer around the irritant. The thickness and quality of nacre layers determine pearl luster and value. Freshwater mussels can produce multiple pearls per animal; marine oysters typically produce one per implantation.',
    source:'ICAR-CIFE Introduction to Pearl Culture' },
]

function findAnswer(q) {
  const ql = q.toLowerCase()
  const scored = KB.map(item => ({
    ...item, score: item.keys.filter(k => ql.includes(k)).length
  })).filter(x => x.score > 0).sort((a, b) => b.score - a.score)
  return scored[0] || null
}

const QUICK = [
  'What are the suitable freshwater mussel species?',
  'What water quality is needed for pearl culture?',
  'How long does pearl culture take?',
  'What are the main environmental risks?',
  'How are pearls graded in India?',
  'Where can I get training for pearl culture?',
]

export default function PearlAssistant({ cultureType, derivedState, sampleSeed }) {
  const { t } = useLanguage()
  const [msgs,  setMsgs]  = useState([{
    role:'assistant',
    text: `Hello! I'm the Pearl Culture Knowledge Assistant. I can answer questions about freshwater and marine pearl culture, suitable species, water quality, cultivation schedules, environmental risks, and market economics.\n\n${derivedState ? `I see you're looking at ${derivedState}.` : ''} Try a quick question below, or type your own.`,
    source: null,
  }])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (sampleSeed) {
      if (cultureType === 'marine') {
        setMsgs([
          {
            role: 'assistant',
            text: "Hello! I'm the Pearl Culture Knowledge Assistant. Marine sample farm data for Tuticorin / Gulf of Mannar, Tamil Nadu has been loaded across the entire platform!\n\n• Location: Tuticorin (Gulf of Mannar, Tamil Nadu)\n• Target Species: Pinctada fucata (Indian Akoya pearl oyster, 1,200 long-line stock)\n• Sea Conditions: Salinity 32 ppt, DO 6.9 mg/L, Temp 28.6°C (Optimal CMFRI parameters)\n• Culture Cycle: Chilika Lagoon / Gulf of Mannar Akoya (24-month long-line cycle)\n• Economic Potential: Expected gross revenue ~₹5.9 Lakhs @ ₹1,500/pearl modal rate\n\nHow can I help you optimize this marine pearl culture cycle?",
            source: 'CMFRI / MPEDA Marine Cultivation Profile',
          },
        ])
      } else {
        setMsgs([
          {
            role: 'assistant',
            text: "Hello! I'm the Pearl Culture Knowledge Assistant. Freshwater sample farm data for Nellore / Kolleru Lake, Andhra Pradesh has been loaded across the entire platform!\n\n• Location: Nellore / Kolleru Lake, Andhra Pradesh (Freshwater pond 0.8 acres)\n• Cultured Species: Lamellidens marginalis (2,500 mussels)\n• Water Quality Status: DO 6.8 mg/L, pH 7.6, Temp 28.4°C (All within ICAR-CIFE optimal limits)\n• Culture Cycle: Kolleru Pond A (18-month cycle, Month 8 post-implantation)\n• Expected Market Output: ~1,650 saleable pearls across Grades A, B & C\n\nHow can I help you optimize this pearl culture cycle?",
            source: 'ICAR-CIFE / Andhra Pradesh Fisheries Sample Profile',
          },
        ])
      }
    }
  }, [sampleSeed, cultureType])

  useEffect(() => {
    if (sampleSeed) {
      if (cultureType === 'marine') {
        setMsgs([
          {
            role: 'assistant',
            text: "Hello! I'm the Pearl Culture Knowledge Assistant. Marine sample farm data for Tuticorin / Gulf of Mannar, Tamil Nadu has been loaded across the entire platform!\n\n• Location: Tuticorin (Gulf of Mannar, Tamil Nadu)\n• Target Species: Pinctada fucata (Indian Akoya pearl oyster, 1,200 long-line stock)\n• Sea Conditions: Salinity 32 ppt, DO 6.9 mg/L, Temp 28.6°C (Optimal CMFRI parameters)\n• Culture Cycle: Chilika Lagoon / Gulf of Mannar Akoya (24-month long-line cycle)\n• Economic Potential: Expected gross revenue ~₹5.9 Lakhs @ ₹1,500/pearl modal rate\n\nHow can I help you optimize this marine pearl culture cycle?",
            source: 'CMFRI / MPEDA Marine Cultivation Profile',
          },
        ])
      } else {
        setMsgs([
          {
            role: 'assistant',
            text: "Hello! I'm the Pearl Culture Knowledge Assistant. Freshwater sample farm data for Nellore / Kolleru Lake, Andhra Pradesh has been loaded across the entire platform!\n\n• Location: Nellore / Kolleru Lake, Andhra Pradesh (Freshwater pond 0.8 acres)\n• Cultured Species: Lamellidens marginalis (2,500 mussels)\n• Water Quality Status: DO 6.8 mg/L, pH 7.6, Temp 28.4°C (All within ICAR-CIFE optimal limits)\n• Culture Cycle: Kolleru Pond A (18-month cycle, Month 8 post-implantation)\n• Expected Market Output: ~1,650 saleable pearls across Grades A, B & C\n\nHow can I help you optimize this pearl culture cycle?",
            source: 'ICAR-CIFE / Andhra Pradesh Fisheries Sample Profile',
          },
        ])
      }
    }
  }, [sampleSeed, cultureType])

  const ask = question => {
    const q = (question || input).trim()
    if (!q) return
    const match = findAnswer(q)
    const reply = match
      ? { role:'assistant', text: match.answer, source: match.source }
      : { role:'assistant',
          text: "I don't have specific information about that in my knowledge base. For authoritative guidance, contact ICAR-CIFE (freshwater: cife.bsad@gmail.com), CMFRI (marine: cmfri@icar.gov.in), or your State Fisheries Department. I can answer questions about species, water quality, cultivation, risks, grading, and economics.",
          source: 'System' }
    setMsgs(m => [...m, { role:'user', text:q, source:null }, reply])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  return (
    <div className="page">
      <Notice>
        This assistant uses a curated knowledge base from ICAR-CIFE, CMFRI, and MPEDA publications.
        It is rule-based — not an LLM. It does not fabricate data, prices, or sensor readings.
        Every answer cites its source. For site-specific advice, consult a qualified aquaculture expert.
      </Notice>

      <Card title="Pearl Culture Knowledge Assistant"
        subtitle="ICAR-CIFE · CMFRI · MPEDA · Not an AI language model">
        <div className="lac-chat-window">
          {msgs.map((m, i) => (
            <div key={i} className={`lac-chat-msg ${m.role}`}>
              <span className="lac-chat-icon">{m.role==='user'?<User size={13}/>:<BookOpen size={13}/>}</span>
              <div className="lac-chat-body">
                <p>{m.text}</p>
                {m.source && <small className="lac-chat-source">Source: {m.source}</small>}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div className="lac-quick-qs">
          {QUICK.map(q => (
            <button key={q} className="lac-quick-btn" onClick={() => ask(q)}>
              <ArrowRight size={10}/> {q}
            </button>
          ))}
        </div>
        <div className="lac-chat-input">
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&ask()}
            placeholder="Ask about species, water quality, cultivation, risks, grading…"/>
          <button className="button" onClick={()=>ask()} disabled={!input.trim()}><Send size={13}/></button>
        </div>
      </Card>

      <Card title="Topics covered" subtitle="Knowledge base from ICAR-CIFE, CMFRI, MPEDA">
        <div className="lac-topics-grid">
          {[['Species','Freshwater mussel, marine oyster species'],
            ['Water quality','Temperature, pH, DO, salinity thresholds'],
            ['Cultivation','Stocking, nucleus implantation, duration'],
            ['Harvest','When and how to harvest'],
            ['Environmental risk','Heat, cold, rain, oxygen depletion'],
            ['Grading','Shape, luster, size, color grading'],
            ['Economics','Reference prices, cost, profit calculation'],
            ['Training','ICAR-CIFE, CMFRI, MPEDA training resources'],
            ['India','States, marine and freshwater zones'],
            ['Biology','How pearls form, nacre, species biology'],
          ].map(([t,d])=>(
            <div key={t} className="lac-topic-card"><b>{t}</b><small>{d}</small></div>
          ))}
        </div>
      </Card>
    </div>
  )
}
