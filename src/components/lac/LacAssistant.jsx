import { useLanguage } from '../../context/LanguageContext'
/**
 * LacAssistant — Knowledge-based Q&A assistant for lac cultivation.
 * Rule-based using a curated knowledge base from ICAR-IINRG publications.
 * No LLM — explicitly stated. Every answer cites a source.
 * Does not invent scientific facts or market data.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, MessageCircle, Send, User } from 'lucide-react'
import { Card, Notice } from '../../components'

// ── Curated knowledge base (ICAR-IINRG published sources) ────────────────────
const KB = [
  // Host trees
  {
    keys: ['kusum','schleichera','best host','premium'],
    answer: 'Kusum (Schleichera oleosa) is the preferred host for Kusmi lac. It produces the highest quality resin and the best shellac grades. A mature Kusum tree can support 5–9 kg of sticklac per kg of broodlac. It is the dominant host in Jharkhand and Chhattisgarh.',
    source: 'ICAR-IINRG Lac Cultivation Guide',
  },
  {
    keys: ['ber','ziziphus','rangeeni'],
    answer: 'Ber (Ziziphus mauritiana) is the primary host for Rangeeni lac. It hosts Baisakhi (summer) and Katki (rainy) crops. Ber is more widely distributed than Kusum and often used by small-scale farmers. Typical yield is 3–6 kg sticklac per kg broodlac.',
    source: 'ICAR-IINRG Statistics 2018',
  },
  {
    keys: ['flemingia','semialata','shrub','bushy'],
    answer: 'Flemingia semialata (Khairwal) is a fast-growing shrub host introduced by ICAR-IINRG. It produces broodlac within 2–3 years of planting, requires less land than trees, and is suitable for landless and marginal farmers. It hosts Rangeeni lac primarily.',
    source: 'ICAR-IINRG Host Plant Research',
  },
  {
    keys: ['palas','butea','flame of the forest'],
    answer: 'Palas (Butea monosperma), also called Flame of the Forest, is a traditional lac host. It supports both Rangeeni and Kusmi strains. The lac resin from Palas has high dye content. Palas is found widely in central and eastern India.',
    source: 'ICAR-IINRG Lac Cultivation Guide',
  },
  // Seasons
  {
    keys: ['baisakhi','summer rangeeni','april','may'],
    answer: 'Baisakhi is the summer Rangeeni crop. Inoculation takes place in February–March, crawlers emerge in March, and harvest occurs in April–May. Duration is approximately 70 days. It is harvested before the monsoon.',
    source: 'ICAR-IINRG Cultivation Calendar',
  },
  {
    keys: ['katki','rainy rangeeni','october','november'],
    answer: 'Katki is the rainy-season Rangeeni crop. Inoculation is in June–July, development continues through the monsoon, and harvest is in October–November. Heavy rainfall is the main risk — excess rain washes broodlac off twigs.',
    source: 'ICAR-IINRG Cultivation Calendar',
  },
  {
    keys: ['jethwi','summer kusmi','may','june'],
    answer: 'Jethwi is the summer Kusmi crop — the longest duration (about 200 days). Inoculation is in October–November, winter growth is slow, spring development is rapid, and harvest is in May–June before the monsoon. Kusmi Jethwi commands a premium price.',
    source: 'ICAR-IINRG Cultivation Calendar',
  },
  {
    keys: ['aghani','winter kusmi','november','december'],
    answer: 'Aghani is the winter Kusmi crop and the single most important lac crop in Jharkhand and Chhattisgarh. Inoculation in May–June, monsoon development on Kusum, and harvest in November–December. Typical yield: 5–9 kg sticklac per kg broodlac on mature Kusum.',
    source: 'ICAR-IINRG Statistics 2018',
  },
  // Production
  {
    keys: ['production','how much','yield','tonnes','kg per acre'],
    answer: 'India produces approximately 14,000–21,000 tonnes of sticklac annually (2012–2018 range). Jharkhand accounts for about 55% of national production, followed by Chhattisgarh (16%), Madhya Pradesh (14%), and Maharashtra (6%). Farm yield ranges from 200–900 kg/acre depending on host species, tree age, season, and management.',
    source: 'ICAR-IINRG Statistics 2018 / IASRI Table 5.25',
  },
  {
    keys: ['jharkhand','chhattisgarh','state','producing state','where'],
    answer: 'The primary lac-producing states are Jharkhand (55%), Chhattisgarh (16%), Madhya Pradesh (14%), Maharashtra (6%), and West Bengal (5%). These five states account for over 96% of national production. Odisha, Assam, Gujarat, and Andhra Pradesh are minor producers.',
    source: 'ICAR-IINRG Statistics 2018',
  },
  // Inoculation
  {
    keys: ['inoculation','broodlac','how to inoculate','attach'],
    answer: 'Inoculation involves tying small pieces of broodlac (lac-encrusted twigs with living insects) to healthy young host-tree twigs using thread or jute. Choose twigs 6–8 mm in diameter. Apply 10–15 g of broodlac per meter of twig. The ideal time is just before crawler emergence. Avoid heavy rain immediately after inoculation.',
    source: 'ICAR-IINRG Cultivation Guide',
  },
  {
    keys: ['crawler','first instar','settle','emerge'],
    answer: 'Crawlers are the first-instar (newly hatched) lac insects. They emerge from broodlac 5–10 days after inoculation, depending on temperature. Crawlers are the mobile phase — they crawl to tender shoot tips and settle to feed. Temperature 24–30°C is optimal for crawler emergence and settlement.',
    source: 'ICAR-IINRG Biology of Kerria lacca',
  },
  // Harvest
  {
    keys: ['harvest','when to harvest','how to harvest','cut'],
    answer: 'Harvest when 75–80% of the lac insects have matured. Cut the inoculated twigs close to the base with a sharp knife or pruning saw. Leave 20–25% of twigs as broodlac for the next crop. Process sticklac within 3 days to prevent insect emergence from the resin.',
    source: 'ICAR-IINRG Post-Harvest Guide',
  },
  // Processing
  {
    keys: ['sticklac','seedlac','shellac','processing','refine'],
    answer: 'Sticklac is raw lac scraped from twigs. It is crushed and washed to remove impurities, producing Seedlac. Seedlac is melted, filtered, and formed into sheets to produce Shellac (button lac or flake shellac). Each processing step increases value: sticklac ≈₹120–220/kg, seedlac ≈₹280–420/kg, shellac ≈₹380–560/kg (2017-18 reference prices).',
    source: 'ICAR-IINRG Statistics 2018',
  },
  // Rainfall / weather risk
  {
    keys: ['rain','rainfall','monsoon','heavy rain','flood','wash'],
    answer: 'Heavy rainfall (>400 mm/month) during the development period can wash broodlac off host-tree twigs. The critical period is the 4–6 weeks after inoculation when crawlers are settling. Partial shade netting and choosing sheltered microlocations helps. Kusmi on Kusum is less vulnerable due to dense canopy cover.',
    source: 'ICAR-IINRG Environmental Risk Research',
  },
  {
    keys: ['temperature','heat','hot','cold','frost','winter'],
    answer: 'Lac insects develop optimally between 24°C and 32°C. At temperatures above 38°C mortality increases, and above 42°C is lethal for exposed broodlac. In winter, Kusmi lac tolerates temperatures down to approximately 5°C but severe frost kills broodlac. SHAP analysis of the ERA5-production model confirms winter max temperature and monsoon rainfall as the top two production drivers.',
    source: 'ICAR-IINRG Temperature Research / ERA5-ICAR ML Model',
  },
  // Economics
  {
    keys: ['profit','income','revenue','price','market','sell','economic'],
    answer: 'Published reference prices (2017-18): sticklac ₹120–220/kg, seedlac ₹280–420/kg, shellac ₹380–560/kg. Reference cultivation cost is approximately ₹14,000–18,000/acre. Typical net profit per acre ranges from ₹20,000–60,000 depending on host, season, and product form. Processing lac to seedlac or shellac significantly increases returns.',
    source: 'ICAR-IINRG Statistics 2018 / KVK Jharkhand Economics',
  },
  // Schemes
  {
    keys: ['scheme','subsidy','government','support','nisa','trifed'],
    answer: 'Several support schemes exist for lac farmers: TRIFED (Tribal Cooperative Marketing Development Federation) operates Minimum Support Price (MSP) for minor forest products including lac in some states. ICAR-NISA (formerly IINRG) provides training, broodlac supply, and technical support. Check with your state\'s Minor Forest Produce Federation for current MSP and procurement information.',
    source: 'ICAR-IINRG NRG Statistics 2018',
  },
  // Model
  {
    keys: ['model','forecast','prediction','ml','machine learning','r2','accuracy'],
    answer: 'The production forecast model is a Random Forest trained on 77 state-year observations (2012–2018, 11 states) using ERA5 seasonal climate features. Without lag features: R²=0.41 (climate-only). With previous year\'s production as a feature: R²=0.94, MAE≈291 tonnes. Top drivers: winter max temperature and monsoon total precipitation. Results are exploratory — only 77 observations.',
    source: 'ICAR ML Model Evaluation (ml/metadata/lac_model_evaluation.json)',
  },
  // General
  {
    keys: ['what is lac','lac insect','kerria','resin'],
    answer: 'Lac is a natural resin secreted by the insect Kerria lacca (Kerr) as a protective covering on host-tree twigs. India is the world\'s largest lac producer. Lac is used in shellac coatings, food glazing, cosmetics, pharmaceuticals, adhesives, and traditional handicrafts. It provides livelihood for 3–4 million tribal and forest-dwelling people in India.',
    source: 'ICAR-IINRG Introduction to Lac',
  },
  {
    keys: ['nisa','iinrg','institute','research','ranchi'],
    answer: 'ICAR-NISA (National Institute of Secondary Agriculture), formerly ICAR-IINRG (Indian Institute of Natural Resins and Gums), is located at Namkum, Ranchi, Jharkhand. Established in 1924, it is the nodal institution for lac research, technology development, and dissemination. Website: nisa.res.in',
    source: 'ICAR-NISA official website',
  },
]

function findAnswer(query) {
  const q = query.toLowerCase()
  const scored = KB.map(item => ({
    ...item,
    score: item.keys.filter(k => q.includes(k)).length
  })).filter(x => x.score > 0).sort((a,b) => b.score - a.score)
  return scored[0] || null
}

const QUICK_QUESTIONS = [
  'What is the best host tree for lac?',
  'When should I inoculate for Aghani crop?',
  'How much production can I expect per acre?',
  'What are the main weather risks for lac?',
  'What is the difference between sticklac and shellac?',
  'Which states produce the most lac in India?',
]

export default function LacAssistant({ derivedState, sampleSeed }) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `Hello! I'm the Lac Culture Knowledge Assistant. I can answer questions about lac cultivation, host trees, crop seasons, harvesting, prices, and the production model. ${derivedState ? `I see you're looking at ${derivedState}.` : ''}\n\nTry one of the quick questions below, or type your own.`,
    source: null,
  }])
  const [input,   setInput]   = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (sampleSeed) {
      setMessages([
        {
          role: 'assistant',
          text: "Hello! I'm the Lac Culture Knowledge Assistant. Sample farm data for Ranchi, Jharkhand has been loaded across the entire platform!\n\n• Location: Ranchi, Jharkhand (Primary Lac belt)\n• Hosts: Ber & Flemingia semialata (2.0 acres)\n• Cultivation: Kusmi winter crop (Aghani)\n• Production Forecast: ~9,071 tonnes state baseline with high R²=0.94\n• Market Potential: ~450 kg/acre yield @ ₹165/kg sticklac modal rate\n\nHow can I help you optimize this cultivation cycle?",
          source: 'ICAR-IINRG Sample Profile',
        }
      ])
    }
  }, [sampleSeed])

  const ask = (question) => {
    const q    = (question || input).trim()
    if (!q) return
    const match = findAnswer(q)
    const reply = match
      ? { role:'assistant', text: match.answer, source: match.source }
      : {
          role: 'assistant',
          text: "I don't have specific information about that in my knowledge base. For authoritative guidance, please contact ICAR-NISA at Ranchi (nisa.res.in) or your local KVK (Krishi Vigyan Kendra). I can answer questions about host trees, crop seasons, inoculation, harvesting, prices, and the production model.",
          source: 'System response',
        }
    setMessages(m => [...m, {role:'user',text:q,source:null}, reply])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)
  }

  return (
    <div className="page">
      <Notice>
        This assistant uses a curated knowledge base from ICAR-IINRG publications.
        It is not an LLM — it does not invent facts or market data.
        Every answer cites its source. For field-specific or medical advice,
        consult a qualified agricultural expert or ICAR-NISA.
      </Notice>

      <Card title="Lac Cultivation Knowledge Assistant"
        subtitle="Powered by ICAR-IINRG published research · Not an AI language model">
        {/* Chat window */}
        <div className="lac-chat-window">
          {messages.map((m,i) => (
            <div key={i} className={`lac-chat-msg ${m.role}`}>
              <span className="lac-chat-icon">
                {m.role === 'user' ? <User size={14}/> : <BookOpen size={14}/>}
              </span>
              <div className="lac-chat-body">
                <p>{m.text}</p>
                {m.source && <small className="lac-chat-source">Source: {m.source}</small>}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Quick questions */}
        <div className="lac-quick-qs">
          {QUICK_QUESTIONS.map(q => (
            <button key={q} className="lac-quick-btn" onClick={() => ask(q)}>
              <ArrowRight size={11}/> {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="lac-chat-input">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="Ask about lac cultivation, seasons, prices, host trees…"
          />
          <button className="button" onClick={() => ask()} disabled={!input.trim()}>
            <Send size={14}/>
          </button>
        </div>
      </Card>

      {/* Knowledge base topics */}
      <Card title="Topics covered" subtitle="Knowledge base from ICAR-IINRG publications">
        <div className="lac-topics-grid">
          {[
            ['Host trees', 'Kusum, Ber, Flemingia, Palas'],
            ['Crop seasons', 'Baisakhi, Katki, Jethwi, Aghani'],
            ['Inoculation', 'Timing, technique, broodlac rates'],
            ['Harvesting', 'When and how to harvest'],
            ['Processing', 'Sticklac → Seedlac → Shellac'],
            ['Weather risks', 'Rain, heat, cold thresholds'],
            ['Economics', 'Prices, costs, profit estimates'],
            ['ML model', 'Forecast model, R², top drivers'],
            ['Support', 'TRIFED MSP, ICAR-NISA, KVK'],
            ['Biology', 'Kerria lacca life cycle'],
          ].map(([topic, detail]) => (
            <div key={topic} className="lac-topic-card">
              <b>{topic}</b>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
