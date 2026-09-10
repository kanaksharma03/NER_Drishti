import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource } from 'maplibre-gl';
import {
  Activity, AlertTriangle, ArrowRight, Camera, Check, ChevronRight, CircleDot,
  CloudRain, Compass, FileText, Gauge, LocateFixed, LogOut, MapPin, Menu,
  Play, Radio, RefreshCw, Route as RouteIcon, Search, ShieldCheck, SlidersHorizontal,
  Upload, Waves, X,
} from 'lucide-react';
import {
  getGetCurrentWeatherQueryKey, getGetHistoryReplayQueryKey, getGetRiskDetailQueryKey,
  getGetRiskGridQueryKey, getGetSafeRouteQueryKey, getListAlertsQueryKey,
  getHealthCheckQueryKey, getListImpactedRoadsQueryKey, getListRegionsQueryKey, getListReportsQueryKey,
  setAuthTokenGetter, setBaseUrl, useGetCurrentWeather, useGetHistoryReplay, useGetRiskDetail,
  useGetRiskGrid, useGetSafeRoute, useHealthCheck, useListAlerts, useListImpactedRoads,
  useListRegions, useListReports, useLogin, useSubmitReport,
} from '@workspace/api-client-react';
import type { Alert, Region, Report, RiskCell, RiskDetail, RiskFactor, RoadImpact } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
if (configuredApiBaseUrl) setBaseUrl(configuredApiBaseUrl);
setAuthTokenGetter(() => localStorage.getItem('ner_drishti_token'));

function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(' '); }
function formatTime(value?: string) { return value ? new Date(value).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'; }
function tone(value?: string) { return value?.toLowerCase().replaceAll('_', '-') ?? ''; }
function severityClass(value?: string) { return `pill-${tone(value)}`; }
function severityColor(value?: string) { return `risk-${tone(value)}`; }

function DataState({ loading, error, empty, children }: { loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  if (loading) return <div className="empty-box mono" data-testid="state-loading">SYNCING OPERATIONAL DATA…</div>;
  if (error) return <div className="error-box" data-testid="state-error">Endpoint unavailable. The display is not fabricating a result. <button className="btn" onClick={() => window.location.reload()} data-testid="button-retry">Retry</button></div>;
  if (empty) return <div className="empty-box" data-testid="state-empty">No records are available for this scope.</div>;
  return <>{children}</>;
}

function Brand() {
  return <div className="rail-brand"><div className="brand-mark">N</div><div style={{ marginTop: 14 }}><div className="brand-name">NER-DRISHTI</div><div className="brand-sub micro">Operational warning network</div></div></div>;
}

const navItems = [
  { href: '/', label: 'Situation room', icon: Gauge },
  { href: '/alerts', label: 'Active alerts', icon: AlertTriangle },
  { href: '/reports', label: 'Field reports', icon: FileText },
  { href: '/replay', label: 'Event replay', icon: RefreshCw },
  { href: '/operations', label: 'Operations', icon: RouteIcon },
];

function Shell({ children, role, onLogout }: { children: ReactNode; role: string; onLogout: () => void }) {
  const [location] = useLocation();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30_000 } });
  return <div className="app-shell">
    <div className="mobile-bar"><strong className="display" style={{ fontSize: 23 }}>NER-DRISHTI</strong><span className="micro">Command center</span></div>
    <aside className="rail">
      <Brand />
      <div className="nav-section"><div className="micro" style={{ color: '#6f8194', padding: '0 12px 9px' }}>Command / monitor</div>{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn('nav-item', location === href && 'active')} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={16} strokeWidth={1.8} /><span>{label}</span></Link>)}</div>
      <div className="rail-footer">
        <div className="micro" style={{ color: '#73869a' }}>Session</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}><span className="mono" style={{ fontSize: 12 }}>{role || 'Authority'}</span><button className="btn" style={{ minHeight: 28, padding: '0 8px', background: 'transparent', color: '#dfe7ef', borderColor: '#4a5a6d' }} onClick={onLogout} data-testid="button-logout"><LogOut size={13} /> Exit</button></div>
        <div className="micro" style={{ color: health.isError ? '#dc8a83' : '#86c59e', marginTop: 15 }} data-testid="status-api-health"><CircleDot size={9} style={{ verticalAlign: '-1px', marginRight: 4 }} />{health.isError ? 'degraded / unavailable' : 'api link nominal'}</div>
      </div>
    </aside>
    <section className="content"><header className="topbar"><div><span className="micro" style={{ color: '#687b8f' }}>Ministry of Development of North Eastern Region</span><div style={{ fontWeight: 600, color: '#31455c', marginTop: 3 }}>Landslide early-warning & decision support</div></div><div className="micro mono" style={{ color: '#6a7b8e' }}>LIVE · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div></header><main className="main">{children}</main></section>
  </div>;
}

function Login({ onLogin }: { onLogin: (token: string, role: string) => void }) {
  const login = useLogin();
  const [role, setRole] = useState<'Authority' | 'Public'>('Authority');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ data: { username, password } }, { onSuccess: (session) => onLogin(session.access_token, session.role) });
  };
  return <div className="login-shell">
    <section className="login-rail"><div><div className="brand-mark">N</div><div className="login-copy"><div className="micro" style={{ color: '#91a2b4', marginTop: 30 }}>NER / DRISHTI 01</div><h1>Predict.<br />Explain.<br />Verify.<br /><span style={{ color: '#e6c766' }}>Act.</span></h1><p>A high-consequence operating view for landslide risk across the North Eastern corridors.</p></div></div><div className="login-statement micro">Signals are only useful when the next action is legible.</div></section>
    <section className="login-card"><div className="micro" style={{ color: '#6f8091' }}>Secure session start</div><h2>Enter command center</h2><p style={{ color: '#69798a', margin: 0 }}>Use your issued Ministry credentials to continue.</p><div className="role-switch">{(['Authority', 'Public'] as const).map(item => <button key={item} className={cn(role === item && 'active')} onClick={() => setRole(item)} type="button" data-testid={`button-role-${item.toLowerCase()}`}>{item}</button>)}</div><form onSubmit={submit}><div className="field"><label className="label micro" htmlFor="username">Credential ID</label><input id="username" className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required data-testid="input-username" /></div><div className="field" style={{ marginTop: 14 }}><label className="label micro" htmlFor="password">Access key</label><input id="password" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required data-testid="input-password" /></div>{login.isError && <div className="error-box" style={{ marginTop: 14 }} data-testid="text-login-error">Credentials rejected. Verify your access key and try again.</div>}<button className="btn btn-primary" style={{ width: '100%', marginTop: 19, minHeight: 42 }} disabled={login.isPending} data-testid="button-login">{login.isPending ? 'AUTHENTICATING…' : 'Start session'}<ArrowRight size={15} /></button></form><div className="micro" style={{ color: '#8a99a8', marginTop: 24, lineHeight: 1.6 }}>AUTHENTICATED REQUESTS ARE LOGGED<br />FOR INCIDENT AUDIT.</div></section>
  </div>;
}

function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="page-kicker micro">{kicker}</div><h1 className="page-title">{title}</h1></div>{action}</div>;
}

function RegionSelect({ regions, selected, onChange }: { regions: Region[]; selected: number; onChange: (id: number) => void }) {
  return <label className="toolbar-field"><span className="label micro">Monitoring region</span><select className="select" value={selected || ''} onChange={e => onChange(Number(e.target.value))} data-testid="select-region">{regions.map(r => <option key={r.id} value={r.id}>{r.state} / {r.district} — {r.corridor_name}</option>)}</select></label>;
}

function SeverityPill({ value }: { value?: string }) { return <span className={cn('severity-pill', severityClass(value))}>{value ?? '—'}</span>; }
function ConfidencePill({ value }: { value?: string }) { return <span className={cn('confidence-pill', `pill-${tone(value) === 'needs-verification' ? 'needs' : tone(value)}`)}>{value?.replaceAll('_', ' ') ?? '—'}</span>; }

function RiskMap({ cells, reports = [], selected, center, onSelect }: { cells: RiskCell[]; reports?: Report[]; selected?: string; center?: [number, number]; onSelect: (cell: RiskCell) => void }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | undefined>(undefined);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const collection = {
    type: 'FeatureCollection' as const,
    features: cells.map(cell => ({
      type: 'Feature' as const,
      id: cell.id,
      properties: { severity: cell.severity, probability: cell.probability, id: cell.id },
      geometry: { type: 'Polygon' as const, coordinates: [[...cell.polygon, cell.polygon[0]]] },
    })),
  };
  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: mapNode.current,
      center: center ?? [92.424, 27.264],
      zoom: 9,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.48, 'raster-saturation': -0.8 } }],
      },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('risk-cells', { type: 'geojson', data: collection });
      map.addLayer({
        id: 'risk-cells-fill',
        type: 'fill',
        source: 'risk-cells',
        paint: {
          'fill-color': ['match', ['get', 'severity'], 'Critical', '#bb4a48', 'High', '#d88937', 'Moderate', '#e0bd4d', '#55a477'],
          'fill-opacity': 0.56,
          'fill-outline-color': '#23313d',
        },
      });
      map.addSource('reports', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: reports.filter(r => typeof r.lon === 'number' && typeof r.lat === 'number' && !isNaN(r.lon) && !isNaN(r.lat)).map(r => ({
            type: 'Feature',
            properties: { id: r.id, type: r.report_type },
            geometry: { type: 'Point', coordinates: [r.lon, r.lat] }
          }))
        }
      });
      map.addLayer({
        id: 'reports-circle',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': 5,
          'circle-color': '#e6c766',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#12181C'
        }
      });
      map.on('click', 'risk-cells-fill', event => {
        const id = event.features?.[0]?.properties?.id;
        const cell = cellsRef.current.find(item => item.id === id);
        if (cell) onSelect(cell);
      });
      map.on('mouseenter', 'risk-cells-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'risk-cells-fill', () => { map.getCanvas().style.cursor = ''; });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = undefined; };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource('risk-cells') as GeoJSONSource | undefined;
      source?.setData(collection);
      const reportSource = map.getSource('reports') as GeoJSONSource | undefined;
      reportSource?.setData({
        type: 'FeatureCollection',
        features: reports.filter(r => typeof r.lon === 'number' && typeof r.lat === 'number' && !isNaN(r.lon) && !isNaN(r.lat)).map(r => ({
          type: 'Feature',
          properties: { id: r.id, type: r.report_type },
          geometry: { type: 'Point', coordinates: [r.lon, r.lat] }
        }))
      });
      if (center) map.easeTo({ center, duration: 700 });
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [cells, reports, center]);
  return <div className="map-surface maplibre-surface" data-testid="map-risk-grid"><div ref={mapNode} className="maplibre-canvas" /><div className="map-overlay"><span className="map-label">Live terrain grid</span><span className="map-status mono" data-testid="text-map-status">{cells.length ? `${cells.length} graded cells · MapLibre live` : 'risk grid integration · no result'}</span></div>{selected && <div className="map-selection mono">Selected: {selected}</div>}</div>;
}

function DetailCard({ detail, loading, error, cell }: { detail?: RiskDetail; loading: boolean; error: boolean; cell?: RiskCell }) {
  return <div className="panel detail-panel"><div className="panel-head"><span className="panel-title">Risk detail / explain</span>{cell && <span className="mono" style={{ fontSize: 11, color: '#708096' }}>{cell.lat.toFixed(4)}N {cell.lon.toFixed(4)}E</span>}</div><DataState loading={loading} error={error} empty={!detail}>{detail && <div className="detail-body"><div className="risk-grade"><div><div className="micro" style={{ color: '#748498' }}>Predicted probability</div><div className="risk-number mono">{Math.round(detail.probability * 100)}%</div></div><div style={{ textAlign: 'right' }}><SeverityPill value={detail.severity} /><div className="severity-word" style={{ marginTop: 9, color: detail.severity === 'Critical' ? '#a13c3d' : '#465971' }}>{detail.severity}</div></div></div><div className="kv-grid"><div className="kv"><dt>Verification</dt><dd><ConfidencePill value={detail.confidence} /></dd></div><div className="kv"><dt>Priority</dt><dd className="mono">{detail.priority}</dd></div><div className="kv"><dt>Road</dt><dd>{detail.road}</dd></div><div className="kv"><dt>Rain / 24h</dt><dd className="mono">{detail.rainfall_24h} mm</dd></div><div className="kv"><dt>Soil moisture</dt><dd className="mono">{detail.soil_moisture}%</dd></div><div className="kv"><dt>Protocol</dt><dd className="mono">P-V-V-A</dd></div></div><div className="micro" style={{ color: '#748498' }}>Why this cell is elevated</div>{detail.factors.map((factor: RiskFactor) => <div className="factor" key={factor.label}><div className="factor-row"><span>{factor.label}</span><span className="mono">{factor.value}</span></div><div className="factor-bar"><div className="factor-fill" style={{ width: `${Math.min(100, Math.max(5, factor.value))}%` }} /></div></div>)}<div className="action-box"><div className="micro" style={{ color: '#5752a4' }}>Recommended action / {detail.priority}</div><p>{detail.action}</p></div></div>}</DataState></div>;
}

function Dashboard({ role }: { role: string }) {
  const regionsQuery = useListRegions({ query: { queryKey: getListRegionsQueryKey(), refetchInterval: 60_000 } });
  const regions = regionsQuery.data ?? [];
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [selectedCell, setSelectedCell] = useState<RiskCell>();
  const [rainfallDelta, setRainfallDelta] = useState(0);
  useEffect(() => { if (!selectedRegion && regions[0]) setSelectedRegion(regions[0].id); }, [regions, selectedRegion]);
  const regionId = selectedRegion || regions[0]?.id || 0;
  const grid = useGetRiskGrid({ region_id: regionId, rainfall_delta: rainfallDelta || undefined }, { query: { enabled: Boolean(regionId), queryKey: getGetRiskGridQueryKey({ region_id: regionId, rainfall_delta: rainfallDelta || undefined }), refetchInterval: 45_000 } });
  const weather = useGetCurrentWeather({ region_id: regionId }, { query: { enabled: Boolean(regionId), queryKey: getGetCurrentWeatherQueryKey({ region_id: regionId }), refetchInterval: 60_000 } });
  const detail = useGetRiskDetail({ lat: selectedCell?.lat ?? 0, lon: selectedCell?.lon ?? 0 }, { query: { enabled: Boolean(selectedCell), queryKey: getGetRiskDetailQueryKey({ lat: selectedCell?.lat ?? 0, lon: selectedCell?.lon ?? 0 }) } });
  const reportsQuery = useListReports({ query: { queryKey: getListReportsQueryKey(), refetchInterval: 60_000 } });
  const cells = grid.data ?? [];
  const reports = reportsQuery.data ?? [];
  const critical = cells.filter(c => c.severity === 'Critical').length, high = cells.filter(c => c.severity === 'High').length;
  const selected = regions.find(r => r.id === regionId);
  return <><SectionHeading kicker="Situation room / live" title="Regional risk posture" action={<div className="toolbar" style={{ marginBottom: 0 }}><RegionSelect regions={regions} selected={regionId} onChange={id => { setSelectedRegion(id); setSelectedCell(undefined); }} />{role === 'Authority' && <><label className="toolbar-field small"><span className="label micro">Simulation Δ mm</span><input className="input mono" type="number" value={rainfallDelta} onChange={e => setRainfallDelta(Number(e.target.value))} data-testid="input-rainfall-delta" /></label><button className="btn btn-indigo" onClick={() => grid.refetch()} data-testid="button-run-simulation"><SlidersHorizontal size={14} /> Run scenario</button></>}</div>} /><DataState loading={regionsQuery.isLoading} error={regionsQuery.isError}>{regions.length > 0 ? <><div className="stat-grid"><div className="panel stat" style={{ '--stat-color': '#bb4a48' } as CSSProperties}><div className="micro">Critical cells</div><div className="stat-value">{critical}</div><div className="stat-note">Immediate command review</div></div><div className="panel stat" style={{ '--stat-color': '#d88937' } as CSSProperties}><div className="micro">High cells</div><div className="stat-value">{high}</div><div className="stat-note">Monitor response thresholds</div></div><div className="panel stat" style={{ '--stat-color': '#e0bd4d' } as CSSProperties}><div className="micro">24h rainfall</div><div className="stat-value">{weather.data?.rainfall_24h ?? '—'}<span style={{ fontSize: 14 }}> mm</span></div><div className="stat-note">72h total {weather.data?.rainfall_72h ?? '—'} mm</div></div><div className="panel stat" style={{ '--stat-color': '#5752a4' } as CSSProperties}><div className="micro">Soil moisture</div><div className="stat-value">{weather.data?.soil_moisture ?? '—'}<span style={{ fontSize: 14 }}>%</span></div><div className="stat-note">Updated {formatTime(weather.data?.updated_at)}</div></div></div>{role === 'Authority' && rainfallDelta !== 0 && <div className="simulation-banner" data-testid="banner-simulation"><span className="micro">SIMULATION / NOT LIVE DATA</span><span>Risk grid is recalculated with a {rainfallDelta > 0 ? '+' : ''}{rainfallDelta} mm rainfall delta. Live observations remain unchanged.</span></div>}<div className="dashboard-grid"><div className="panel map-panel"><div className="panel-head"><span className="panel-title">Predict / graded risk grid</span><span className="mono" style={{ fontSize: 11, color: '#718195' }}>{selected?.corridor_name ?? 'selected corridor'}</span></div><DataState loading={grid.isLoading} error={grid.isError} empty={!grid.data?.length}><RiskMap cells={cells} reports={reports} selected={selectedCell?.id} center={selected ? [selected.center_lon, selected.center_lat] : undefined} onSelect={setSelectedCell} /></DataState><div className="map-legend"><span><i className="legend-dot risk-low" />Low</span><span><i className="legend-dot risk-moderate" />Moderate</span><span><i className="legend-dot risk-high" />High</span><span><i className="legend-dot risk-critical" />Critical</span><span style={{ marginLeft: 'auto' }} className="mono">click cell to explain</span></div></div><DetailCard detail={detail.data} loading={detail.isLoading} error={detail.isError} cell={selectedCell} /></div></> : <div className="empty-box">No monitoring regions returned.</div>}</DataState></>;
}

function AlertsPage() {
  const alerts = useListAlerts({ query: { queryKey: getListAlertsQueryKey(), refetchInterval: 30_000 } });
  const [filter, setFilter] = useState('All'); const [acknowledged, setAcknowledged] = useState<string[]>(() => JSON.parse(localStorage.getItem('ner_acknowledged') ?? '[]'));
  const items = (alerts.data ?? []).filter(a => filter === 'All' || a.severity === filter);
  const ack = (id: string) => { const next = [...new Set([...acknowledged, id])]; setAcknowledged(next); localStorage.setItem('ner_acknowledged', JSON.stringify(next)); };
  return <><SectionHeading kicker="Response queue / active" title="Active alerts" action={<button className="btn" onClick={() => alerts.refetch()} data-testid="button-refresh-alerts"><RefreshCw size={14} /> Refresh feed</button>} /><div className="toolbar"><label className="toolbar-field small"><span className="label micro">Severity filter</span><select className="select" value={filter} onChange={e => setFilter(e.target.value)} data-testid="select-alert-severity"><option>All</option><option>Critical</option><option>High</option><option>Moderate</option><option>Low</option></select></label><div className="micro mono" style={{ paddingBottom: 10, color: '#78889a' }}>{items.length} records · acknowledgement is local operator state</div></div><div className="panel table-wrap"><DataState loading={alerts.isLoading} error={alerts.isError} empty={!items.length}><table><thead><tr><th>Alert</th><th>Severity</th><th>Location</th><th>Recommended action</th><th>Raised</th><th>Verify / act</th></tr></thead><tbody>{items.map((alert: Alert) => <tr key={alert.id} data-testid={`row-alert-${alert.id}`}><td><strong>{alert.title}</strong><div className="mono" style={{ fontSize: 10, color: '#8391a0', marginTop: 4 }}>{alert.id}</div></td><td><SeverityPill value={alert.severity} /></td><td>{alert.location}</td><td style={{ maxWidth: 330 }}>{alert.action}</td><td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatTime(alert.created_at)}</td><td>{acknowledged.includes(alert.id) ? <span className="status-pill pill-verified"><Check size={12} /> ACKNOWLEDGED</span> : <button className="btn btn-primary" onClick={() => ack(alert.id)} data-testid={`button-acknowledge-${alert.id}`}><ShieldCheck size={14} /> Acknowledge</button>}</td></tr>)}</tbody></table></DataState></div></>;
}

function ReportsPage() {
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey(), refetchInterval: 45_000 } }); const submit = useSubmitReport(); const queryClient = useQueryClient();
  const [type, setType] = useState('Landslide'); const [description, setDescription] = useState(''); const [lat, setLat] = useState(''); const [lon, setLon] = useState(''); const [photo, setPhoto] = useState<Blob>(); const [message, setMessage] = useState('');
  const locate = () => navigator.geolocation?.getCurrentPosition(position => { setLat(position.coords.latitude.toFixed(6)); setLon(position.coords.longitude.toFixed(6)); }, () => setMessage('Location permission was not granted.'));
  useEffect(() => {
    const handleOnline = () => {
      let offline: any[] = [];
      try { offline = JSON.parse(localStorage.getItem('ner_offline_reports') || '[]'); } catch (e) { offline = []; }
      if (!Array.isArray(offline)) offline = [];
      
      if (offline.length) {
        setMessage(`Syncing ${offline.length} offline reports...`);
        let pending = [...offline];
        localStorage.removeItem('ner_offline_reports');
        offline.forEach((r: any) => {
          submit.mutate({ data: r }, {
            onSuccess: () => {
              pending = pending.filter(p => p !== r);
              if (pending.length === 0) { 
                setMessage('All offline reports synced successfully.'); 
                queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); 
              }
            },
            onError: () => {
              let current: any[] = [];
              try { current = JSON.parse(localStorage.getItem('ner_offline_reports') || '[]'); } catch (e) { current = []; }
              if (!Array.isArray(current)) current = [];
              current.push(r);
              localStorage.setItem('ner_offline_reports', JSON.stringify(current));
              setMessage('Some offline reports failed to sync and remain queued.');
            }
          });
        });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [submit, queryClient]);
  const onSubmit = (event: FormEvent) => { 
    event.preventDefault(); setMessage(''); 
    if (!navigator.onLine) {
      let offline: any[] = [];
      try { offline = JSON.parse(localStorage.getItem('ner_offline_reports') || '[]'); } catch (e) { offline = []; }
      if (!Array.isArray(offline)) offline = [];
      offline.push({ report_type: type, description, lat: Number(lat), lon: Number(lon) });
      localStorage.setItem('ner_offline_reports', JSON.stringify(offline));
      setMessage('Saved offline. Will synchronize when connection returns.');
      setDescription(''); setPhoto(undefined);
      return;
    }
    submit.mutate({ data: { report_type: type, description, lat: Number(lat), lon: Number(lon), photo } }, { onSuccess: result => { setMessage(result.spoof_flagged ? 'Report received for review. Verification flag raised.' : `Report received. Cluster ${result.cluster_id} queued.`); setDescription(''); setPhoto(undefined); queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); }, onError: () => setMessage('Submission failed. Check coordinates and try again.') }); 
  };
  return <><SectionHeading kicker="Ground truth / citizen + field" title="Reports" /><div className="two-col"><div className="panel"><div className="panel-head"><span className="panel-title">Submit observation</span><span className="micro" style={{ color: '#718196' }}>verification input</span></div><form className="report-form" onSubmit={onSubmit}><div className="field"><label className="label micro">Report type</label><select className="select" value={type} onChange={e => setType(e.target.value)} data-testid="select-report-type"><option>Landslide</option><option>Road blockage</option><option>Crack / ground movement</option><option>Rainfall anomaly</option></select></div><div className="field"><label className="label micro">Description</label><textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What did you observe? Include direction, scale, and access impact." required data-testid="textarea-report-description" /></div><div className="form-grid"><div className="field"><label className="label micro">Latitude</label><input className="input mono" value={lat} onChange={e => setLat(e.target.value)} placeholder="27.4728" required data-testid="input-report-latitude" /></div><div className="field"><label className="label micro">Longitude</label><input className="input mono" value={lon} onChange={e => setLon(e.target.value)} placeholder="94.9120" required data-testid="input-report-longitude" /></div></div><button type="button" className="btn" style={{ marginTop: 10 }} onClick={locate} data-testid="button-use-location"><LocateFixed size={14} /> Use browser location</button><div className="upload field"><label className="label micro"><Camera size={13} style={{ verticalAlign: '-2px' }} /> Evidence photo</label><input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files?.[0])} data-testid="input-report-photo" /></div>{message && <div className="empty-box" style={{ marginTop: 13 }} data-testid="text-report-message">{message}</div>}<button className="btn btn-primary" style={{ width: '100%', marginTop: 15 }} disabled={submit.isPending} data-testid="button-submit-report">{submit.isPending ? 'TRANSMITTING…' : 'Submit field report'}<Upload size={14} /></button></form></div><div className="panel"><div className="panel-head"><span className="panel-title">Report history</span><span className="mono" style={{ color: '#718195', fontSize: 11 }}>{reports.data?.length ?? 0} records</span></div><div className="table-wrap"><DataState loading={reports.isLoading} error={reports.isError} empty={!reports.data?.length}><table><thead><tr><th>Type</th><th>Description</th><th>Status</th><th>Received</th></tr></thead><tbody>{reports.data?.map(report => <tr key={report.id} data-testid={`row-report-${report.id}`}><td><strong>{report.report_type}</strong><div className="mono" style={{ fontSize: 10, color: '#8492a0' }}>{report.id}</div></td><td style={{ maxWidth: 280 }}>{report.description}<div className="mono" style={{ fontSize: 10, color: '#7c8a99', marginTop: 4 }}>{report.lat.toFixed(4)}, {report.lon.toFixed(4)}</div></td><td><span className="status-pill pill-verified">{report.status}</span></td><td className="mono" style={{ fontSize: 11 }}>{formatTime(report.created_at)}</td></tr>)}</tbody></table></DataState></div></div></div></>;
}

function ReplayPage() {
  const replay = useGetHistoryReplay({ query: { queryKey: getGetHistoryReplayQueryKey() } }); const [frameIndex, setFrameIndex] = useState(0); const [playing, setPlaying] = useState(false); const frames = replay.data?.frames ?? []; const frame = frames[frameIndex];
  useEffect(() => { if (!playing || frames.length < 2) return; const timer = window.setInterval(() => setFrameIndex(i => i >= frames.length - 1 ? 0 : i + 1), 1800); return () => window.clearInterval(timer); }, [playing, frames.length]);
  return <><SectionHeading kicker="Forensics / temporal view" title="Historical event replay" action={<button className={cn('btn', playing && 'btn-indigo')} onClick={() => setPlaying(p => !p)} disabled={!frames.length} data-testid="button-replay-play">{playing ? <><X size={14} /> Pause</> : <><Play size={14} /> Play replay</>}</button>} /><DataState loading={replay.isLoading} error={replay.isError} empty={!replay.data}>{replay.data && <div className="panel"><div className="panel-head"><div><span className="panel-title">{replay.data.event_name}</span><div style={{ color: '#718195', marginTop: 3 }}>{replay.data.location}</div></div><span className="mono" style={{ fontSize: 12, color: '#718195' }}>{frames.length} frames</span></div><div className="replay-stage"><div className="replay-content">{frame ? <><div className="micro" style={{ color: '#91a4b4' }}>Frame {String(frameIndex + 1).padStart(2, '0')} / {frame.timestamp}</div><div className="replay-number">{frame.modifier > 0 ? '+' : ''}{frame.modifier}%</div><div className="micro" style={{ color: '#e6c766', marginTop: 20 }}>{frame.label}</div><p className="replay-note">{frame.narrative}</p></> : <div className="replay-note">Select a frame to inspect the historical state.</div>}</div></div><div className="scrubber"><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><span className="micro">Timeline scrubber</span><span className="mono" style={{ fontSize: 11 }}>{frame?.timestamp ?? '—'}</span></div><input type="range" min={0} max={Math.max(0, frames.length - 1)} value={frameIndex} onChange={e => setFrameIndex(Number(e.target.value))} data-testid="input-replay-scrubber" /><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#78889a', fontSize: 11 }}>{frames.map((item, index) => <button key={item.timestamp} style={{ border: 0, background: 'transparent', color: index === frameIndex ? '#5752a4' : '#78889a', fontFamily: 'var(--app-font-mono)', fontSize: 10 }} onClick={() => setFrameIndex(index)} data-testid={`button-replay-frame-${index}`}>{item.label}</button>)}</div></div></div>}</DataState></>;
}

function OperationsPage() {
  const regionsQuery = useListRegions({ query: { queryKey: getListRegionsQueryKey() } }); const regions = regionsQuery.data ?? []; const [regionId, setRegionId] = useState(0); const roads = useListImpactedRoads({ query: { queryKey: getListImpactedRoadsQueryKey(), refetchInterval: 45_000 } }); const route = useGetSafeRoute({ region_id: regionId || regions[0]?.id || 0 }, { query: { enabled: Boolean(regionId || regions[0]?.id), queryKey: getGetSafeRouteQueryKey({ region_id: regionId || regions[0]?.id || 0 }) } }); useEffect(() => { if (!regionId && regions[0]) setRegionId(regions[0].id); }, [regions, regionId]);
  return <><SectionHeading kicker="Mobility / response logistics" title="Operations" action={<div className="toolbar" style={{ marginBottom: 0 }}><RegionSelect regions={regions} selected={regionId || regions[0]?.id || 0} onChange={setRegionId} /></div>} /><div className="two-col"><div className="panel"><div className="panel-head"><span className="panel-title">Impacted roads</span><span className="mono" style={{ fontSize: 11, color: '#738397' }}>{roads.data?.length ?? 0} segments</span></div><DataState loading={roads.isLoading} error={roads.isError} empty={!roads.data?.length}><div className="table-wrap"><table><thead><tr><th>Road</th><th>Status</th><th>Severity</th><th>Affected segment</th></tr></thead><tbody>{roads.data?.map((road: RoadImpact) => <tr key={`${road.road}-${road.affected_segment}`} data-testid={`row-road-${road.road}`}><td><strong>{road.road}</strong><div style={{ color: '#7b8b9b', fontSize: 11 }}>{road.region}</div></td><td>{road.status}</td><td><SeverityPill value={road.severity} /></td><td>{road.affected_segment}</td></tr>)}</tbody></table></div></DataState></div><div className="panel"><div className="panel-head"><span className="panel-title">Safe route / act</span><span className="micro" style={{ color: '#5752a4' }}>avoids known impact</span></div><DataState loading={route.isLoading} error={route.isError} empty={!route.data}>{route.data && <><div className="route-banner"><div className="route-node"><span className="micro">Origin</span><strong>{route.data.origin}</strong></div><div className="route-line" /><div className="route-node" style={{ textAlign: 'right' }}><span className="micro">Destination</span><strong>{route.data.destination}</strong></div></div><div className="road-map"><div className="road main-road" style={{ left: '9%', top: '72%', width: '84%', transform: 'rotate(-29deg)' }} /><div className="road affected" style={{ left: '41%', top: '49%', width: '22%', transform: 'rotate(-29deg)' }} /><div className="road-route" style={{ left: '17%', top: '79%', width: '76%', transform: 'rotate(-8deg)' }} /><div className="map-key"><span className="micro">Indigo route</span><br />avoids {route.data.avoided_segment}</div></div><div style={{ padding: 17 }}><div className="micro" style={{ color: '#758599' }}>Recommended corridor</div><h3 style={{ margin: '6px 0 14px', fontSize: 20, color: '#2b4057' }}>{route.data.route_name}</h3><div className="kv-grid"><div className="kv"><dt>Distance</dt><dd className="mono">{route.data.distance_km} km</dd></div><div className="kv"><dt>Estimated time</dt><dd className="mono">{route.data.eta_minutes} min</dd></div><div className="kv" style={{ gridColumn: 'span 2', borderRight: 0, borderBottom: 0 }}><dt>Avoided segment</dt><dd>{route.data.avoided_segment}</dd></div></div></div></>}</DataState></div></div></>;
}

function AuthRouter() {
  const [location, setLocation] = useLocation(); const [token, setToken] = useState(() => localStorage.getItem('ner_drishti_token')); const [role, setRole] = useState(() => localStorage.getItem('ner_drishti_role') ?? 'Authority');
  useEffect(() => { if (!token && location !== '/login') setLocation('/login'); }, [location, setLocation, token]);
  const logout = () => { localStorage.removeItem('ner_drishti_token'); localStorage.removeItem('ner_drishti_role'); queryClient.clear(); setToken(null); setLocation('/login'); };
  if (!token) return <Switch><Route path="/login"><Login onLogin={(nextToken, nextRole) => { localStorage.setItem('ner_drishti_token', nextToken); localStorage.setItem('ner_drishti_role', nextRole); setToken(nextToken); setRole(nextRole); setLocation('/'); }} /></Route><Route><Login onLogin={(nextToken, nextRole) => { localStorage.setItem('ner_drishti_token', nextToken); localStorage.setItem('ner_drishti_role', nextRole); setToken(nextToken); setRole(nextRole); setLocation('/'); }} /></Route></Switch>;
  return <Shell role={role} onLogout={logout}><Switch><Route path="/"><Dashboard role={role} /></Route><Route path="/alerts" component={AlertsPage} /><Route path="/reports" component={ReportsPage} /><Route path="/replay" component={ReplayPage} /><Route path="/operations" component={OperationsPage} /><Route component={NotFound} /></Switch></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><AuthRouter /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;