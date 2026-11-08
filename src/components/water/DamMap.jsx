import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useLanguage } from '../../context/LanguageContext'

// Leaflet CSS is already loaded via index.html — do not import it here.

const DAM_COLOR       = '#1a6fa8'
const RESERVOIR_COLOR = '#2d9e6e'
const SELECTED_COLOR  = '#d97706'

export default function DamMap({
  dams = [],
  reservoirs = [],
  center,
  zoom,
  selected,
  onSelectDam,
  onSelectReservoir,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const damLayerRef  = useRef(null)
  const resLayerRef  = useRef(null)
  const initializedRef = useRef(false)

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return
    initializedRef.current = true

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    damLayerRef.current = L.layerGroup().addTo(map)
    resLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      damLayerRef.current = null
      resLayerRef.current = null
      initializedRef.current = false
    }
  }, [])

  // ── Fly to new location ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !center || !center[0]) return
    mapRef.current.flyTo(center, zoom || 10, { duration: 1.0 })
  }, [center, zoom])

  // ── Redraw dam markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const layer = damLayerRef.current
    const map   = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()
    dams.forEach(dam => {
      const isSel  = selected?.type === 'dam' && selected?.id === dam.id
      const color  = isSel ? SELECTED_COLOR : DAM_COLOR
      const marker = L.circleMarker([dam.lat, dam.lng], {
        radius: isSel ? 10 : 7,
        fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.9,
      })
      marker.bindPopup(
        `<b style="font-size:13px">${dam.name}</b><br>` +
        `<span style="color:#555;font-size:11px">${dam.state}${dam.district ? ' · ' + dam.district : ''}</span><br>` +
        (dam.river   ? `<span style="font-size:11px">River: ${dam.river}</span><br>` : '') +
        (dam.purpose ? `<span style="font-size:11px">Purpose: ${dam.purpose}</span><br>` : '') +
        (dam.gross_storage_mcm ? `<span style="font-size:11px">Storage: ${dam.gross_storage_mcm} MCM</span><br>` : '') +
        (dam.completion_year   ? `<span style="font-size:11px">Completed: ${dam.completion_year}</span><br>` : '') +
        `<small style="color:#999">NDSA · Static inventory</small>`
      )
      marker.on('click', () => onSelectDam?.(dam))
      layer.addLayer(marker)
    })
  }, [dams, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw reservoir markers ───────────────────────────────────────────────
  useEffect(() => {
    const layer = resLayerRef.current
    const map   = mapRef.current
    if (!layer || !map) return

    layer.clearLayers()
    reservoirs.forEach(res => {
      const isSel  = selected?.type === 'reservoir' && selected?.id === res.id
      const color  = isSel ? SELECTED_COLOR : RESERVOIR_COLOR
      const marker = L.circleMarker([res.lat, res.lng], {
        radius: isSel ? 9 : 6,
        fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.85,
      })
      marker.bindPopup(
        `<b style="font-size:13px">${res.res_name}</b><br>` +
        (res.basin   ? `<span style="font-size:11px">${res.basin}</span><br>` : '') +
        (res.river   ? `<span style="font-size:11px">River: ${res.river}</span><br>` : '') +
        (res.area_ha ? `<span style="font-size:11px">Area: ${Number(res.area_ha).toFixed(1)} ha</span><br>` : '') +
        (res.distance_km != null ? `<span style="font-size:11px">${res.distance_km} km away</span><br>` : '') +
        `<small style="color:#999">CWC · Static inventory</small>`
      )
      marker.on('click', () => onSelectReservoir?.(res))
      layer.addLayer(marker)
    })
  }, [reservoirs, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="wr-map-wrapper">
      <div
        ref={containerRef}
        style={{ height: '480px', width: '100%', borderRadius: 10, border: '1px solid #e0e8e0' }}
      />
      <div className="wr-map-legend">
        <span><i style={{ background: DAM_COLOR }} />Dam (NDSA)</span>
        <span><i style={{ background: RESERVOIR_COLOR }} />Reservoir (CWC)</span>
        <span><i style={{ background: SELECTED_COLOR }} />Selected</span>
      </div>
      <p className="wr-map-attr">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · NDSA / CWC — static inventory
      </p>
    </div>
  )
}
