import re

with open('scratch_app.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import type { Alert, Region, Report, RiskCell, RiskDetail, RiskFactor, RoadImpact } from '@workspace/api-client-react';",
    "import type { Alert, Region, Report, RiskDetail, RiskFactor, RiskGridResponse, RoadImpactsResponse, SafeRoute } from '@workspace/api-client-react';\n\ntype RiskCell = { id: number; lat: number; lon: number; probability: number; severity: string; polygon: [number, number][]; };"
)

# 2. DetailCard
content = content.replace(
    "<div className=\"kv\"><dt>Verification</dt><dd><ConfidencePill value={detail.confidence} /></dd></div><div className=\"kv\"><dt>Priority</dt><dd className=\"mono\">{detail.priority}</dd></div><div className=\"kv\"><dt>Road</dt><dd>{detail.road}</dd></div><div className=\"kv\"><dt>Rain / 24h</dt><dd className=\"mono\">{detail.rainfall_24h} mm</dd></div><div className=\"kv\"><dt>Soil moisture</dt><dd className=\"mono\">{detail.soil_moisture}%</dd></div>",
    ""
)
content = content.replace(
    "<div className=\"action-box\"><div className=\"micro\" style={{ color: '#5752a4' }}>Recommended action / {detail.priority}</div><p>{detail.action}</p></div>",
    ""
)
content = content.replace(
    "{detail.factors.map((factor: RiskFactor) => <div className=\"factor\" key={factor.label}><div className=\"factor-row\"><span>{factor.label}</span><span className=\"mono\">{factor.value}</span></div><div className=\"factor-bar\"><div className=\"factor-fill\" style={{ width: \${Math.min(100, Math.max(5, factor.value))}%\ }} /></div></div>)}",
    "{detail.top_factors.map((factor: RiskFactor) => <div className=\"factor\" key={factor.feature}><div className=\"factor-row\"><span>{factor.feature}</span><span className=\"mono\">{factor.contribution}</span></div><div className=\"factor-bar\"><div className=\"factor-fill\" style={{ width: \${Math.min(100, Math.max(5, factor.contribution * 100))}%\ }} /></div></div>)}"
)

# 3. Dashboard Grid Response Mapping
dashboard_mapping = """  const cells: RiskCell[] = grid.data?.features?.map(f => {
    const prob = f.properties.probability;
    const severity = prob > 0.8 ? 'Critical' : prob > 0.5 ? 'High' : prob > 0.2 ? 'Moderate' : 'Low';
    return {
      id: f.id,
      lat: f.geometry.coordinates[0][0][1],
      lon: f.geometry.coordinates[0][0][0],
      probability: prob,
      severity,
      polygon: f.geometry.coordinates[0] as [number, number][]
    };
  }) ?? [];"""
content = content.replace("const cells = grid.data ?? [];", dashboard_mapping)

# 4. AlertsPage
content = content.replace("a.severity === filter", "a.severity_tier === filter")
content = content.replace("<td><SeverityPill value={alert.severity} /></td><td>{alert.location}</td><td style={{ maxWidth: 330 }}>{alert.action}</td>", "<td><SeverityPill value={alert.severity_tier} /></td><td>—</td><td style={{ maxWidth: 330 }}>{alert.message_payload}</td>")

# 5. ReportsPage
content = content.replace("spoof_flagged", "is_spoofed")
content = content.replace("type: report_type", "type: r.report_type") # Not needed, wait, it was report_type: type -> type
content = content.replace("report_type: type", "type")

# 6. ReplayPage
content = content.replace("replay.data.event_name", "replay.data.event")
content = content.replace("replay.data.location", "''")
content = content.replace("frame.timestamp", "frame.time")
content = content.replace("frame.modifier", "frame.risk_modifier")
content = content.replace("frame.label", "frame.description")
content = content.replace("frame.narrative", "''")
content = content.replace("item.timestamp", "item.time")

# 7. OperationsPage
content = content.replace("roads.data?.length", "roads.data?.impacted_segments?.length")
content = content.replace("roads.data?.map((road: RoadImpact)", "roads.data?.impacted_segments?.map((road: any)")
content = content.replace("route.data.origin", "'Corridor Start'")
content = content.replace("route.data.destination", "'Corridor End'")
content = content.replace("route.data.route_name", "route.data.active_route ? 'Alternate Route Active' : 'Primary Route'")
content = content.replace("route.data.avoided_segment", "route.data.is_primary_blocked ? 'High Risk Zone' : 'None'")
content = content.replace("route.data.distance_km", "'—'")
content = content.replace("route.data.eta_minutes", "'—'")
content = content.replace("key={${road.road}-}", "key={${road.name}-}")
content = content.replace("data-testid={ow-road-}", "data-testid={ow-road-}")
content = content.replace("<strong>{road.road}</strong><div style={{ color: '#7b8b9b', fontSize: 11 }}>{road.region}</div>", "<strong>{road.name}</strong><div style={{ color: '#7b8b9b', fontSize: 11 }}>{road.highway_class}</div>")
content = content.replace("<td>{road.status}</td>", "<td>—</td>")
content = content.replace("<SeverityPill value={road.severity} />", "<SeverityPill value={road.risk_level} />")
content = content.replace("<td>{road.affected_segment}</td>", "<td>—</td>")

with open('C:/Users/lenovo/OneDrive/Desktop/NERDrishti/NER-FRONTEND/Frontend_NER/artifacts/ner-drishti/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
