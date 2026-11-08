import React, { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle, Check, CheckCircle2, Download, FileText, Loader2, Printer, X
} from 'lucide-react'
import { REPORT_STEPS, generateFarmerReport } from '../../services/farmerReportService'
import { tr, REPORT_LANGUAGES, getLocalizedStepTitle } from '../../services/reportTranslations'
import FarmerReportDocument from './FarmerReportDocument'
import './reportStyles.css'

export default function FarmerReportProgressModal({ farmer, language, onClose, t: parentT }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [stepTitle, setStepTitle] = useState(REPORT_STEPS[0].title)
  const [completed, setCompleted] = useState(false)
  const [report, setReport]       = useState(null)
  const [downloading, setDownloading] = useState(false)
  const docRef = useRef(null)

  const lang = language || 'en'
  const t = (k, f) => tr(k, lang, f || k)

  useEffect(() => {
    let cancelled = false

    async function runGeneration() {
      try {
        const result = await generateFarmerReport(farmer, language, (index, title) => {
          if (!cancelled) {
            setStepIndex(index)
            setStepTitle(title)
          }
        })
        if (!cancelled) {
          setReport(result)
          setCompleted(true)
        }
      } catch (err) {
        console.error('Report generation error:', err)
        if (!cancelled) {
          setCompleted(true)
        }
      }
    }

    runGeneration()
    return () => { cancelled = true }
  }, [farmer, language])

  // PDF Download using html2pdf.js
  const handleDownloadPdf = async () => {
    setDownloading(true)
    const element = document.getElementById('farmer-report-pdf-root')
    if (!element) {
      setDownloading(false)
      return
    }

    const farmerName = (farmer.name || 'Farmer').replace(/\s+/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10)
    const fileName = `Complete_Farmer_Report_${farmerName}_${dateStr}.pdf`

    try {
      const html2pdf = (await import('html2pdf.js')).default
      const opt = {
        margin:       [10, 8, 10, 8],
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
      }
      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.warn('html2pdf download note, falling back to print:', err)
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const progressPercent = Math.min(100, Math.round(((stepIndex + 1) / REPORT_STEPS.length) * 100))

  return (
    <div className="report-modal-overlay" data-no-dom-translate="true">
      <div className="report-modal-card">
        {/* Header Toolbar */}
        <div className="report-modal-header">
          <h3>
            <FileText size={18} color="#15803d" />
            {t('Complete Farmer Intelligence Report', 'Complete Farmer Intelligence Report')}
          </h3>

          <div className="report-header-actions">
            {completed && (
              <>
                <button
                  type="button"
                  className="button secondary"
                  onClick={handlePrint}
                  title={t('Print or Save via browser', 'Print or Save via browser')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px', padding: '6px 12px' }}
                >
                  <Printer size={14} />
                  {t('Print / Save', 'Print / Save')}
                </button>

                <button
                  type="button"
                  className="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '12.5px',
                    padding: '6px 14px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  title={t('Download PDF document', 'Download PDF document')}
                >
                  {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                  {downloading ? t('Generating PDF…', 'Generating PDF…') : t('Download PDF', 'Download PDF')}
                </button>
              </>
            )}

            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress or Document View */}
        {!completed ? (
          <div className="report-progress-wrap" data-no-dom-translate="true">
            <div className="report-progress-header" data-no-dom-translate="true">
              <h2 data-no-dom-translate="true">{tr('generatingReportHeader', lang, 'Generating Complete Farmer Intelligence Report')}</h2>
              <p data-no-dom-translate="true">{tr('generatingReportSub', lang, 'Collecting verified model predictions and datasets across all 11 modules...')}</p>
            </div>

            <div className="report-progress-bar-bg">
              <div className="report-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="report-progress-steps">
              {REPORT_STEPS.map((s, idx) => {
                const isCurrent = idx === stepIndex
                const isDone = idx < stepIndex
                return (
                  <div
                    key={s.id}
                    className={`report-progress-step-row ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : isCurrent ? (
                      <Loader2 size={16} color="#15803d" className="spin" />
                    ) : (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />
                    )}
                    <span>{getLocalizedStepTitle(s.id, lang)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div ref={docRef}>
            <FarmerReportDocument report={report} t={t} />
          </div>
        )}
      </div>
    </div>
  )
}

