import fs from 'fs';
import path from 'path';

export interface TestResultItem {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  user_messages: string[];
  bot_responses: string[];
  failure_reason?: string;
  duration_ms: number;
}

export interface SummaryReport {
  tenant: string;
  timestamp: string;
  total_tests: number;
  passed: number;
  failed: number;
  errors: number;
  score_percentage: number;
  critical_failures: number;
  high_failures: number;
  medium_failures: number;
  low_failures: number;
  hallucinations_detected: number;
  security_leaks_detected: number;
  results: TestResultItem[];
}

export function generateHtmlReport(summary: SummaryReport, outputPath: string): void {
  const isApproved = summary.score_percentage >= 95 && summary.critical_failures === 0;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LibreríaQR — Reporte de Prueba de Fuego (100 Tests)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 26, 44, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.3);
      --pass: #10b981;
      --fail: #ef4444;
      --warn: #f59e0b;
      --critical: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 40px 20px; line-height: 1.5; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    header {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 35px;
      margin-bottom: 30px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }
    .header-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
    h1 { font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #fff, #93c5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .badge-status {
      padding: 10px 22px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: ${isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      border: 1px solid ${isApproved ? 'var(--pass)' : 'var(--fail)'};
      color: ${isApproved ? '#34d399' : '#f87171'};
      box-shadow: 0 0 20px ${isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
    }
    .meta-info { margin-top: 15px; color: var(--text-muted); font-size: 0.9rem; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(12px);
    }
    .stat-val { font-size: 2rem; font-weight: 800; margin-top: 5px; }
    .stat-lbl { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
    
    .filter-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 18px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      box-shadow: 0 0 15px var(--accent-glow);
    }

    .test-list { display: flex; flex-direction: column; gap: 15px; }
    .test-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      transition: transform 0.2s ease;
    }
    .test-card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.2); }
    .test-card.fail { border-left: 4px solid var(--fail); }
    .test-card.pass { border-left: 4px solid var(--pass); }
    
    .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .test-id { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #60a5fa; font-size: 0.9rem; }
    .test-title { font-weight: 600; font-size: 1.05rem; margin-left: 10px; }
    .test-sev { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
    .sev-critical { background: rgba(220, 38, 38, 0.2); color: #f87171; border: 1px solid rgba(220, 38, 38, 0.4); }
    .sev-high { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .sev-medium { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }
    .sev-low { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); }
    
    .conv-box {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      padding: 15px;
      margin-top: 12px;
      font-size: 0.88rem;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .msg-user { color: #38bdf8; margin-bottom: 8px; }
    .msg-bot { color: #e2e8f0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; margin-bottom: 10px; }
    .fail-alert { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <h1>🔥 Test de Fuego — Chatbot de Papelería</h1>
          <p class="meta-info">Tenant: <strong>${summary.tenant}</strong> | Fecha: <strong>${summary.timestamp}</strong></p>
        </div>
        <div class="badge-status">
          ${isApproved ? 'APROBADO' : 'FALLÓ EL TEST DE FUEGO'} (${summary.score_percentage.toFixed(1)}%)
        </div>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-lbl">Pruebas Totales</div>
        <div class="stat-val" style="color: #60a5fa">${summary.total_tests}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Aprobadas (PASS)</div>
        <div class="stat-val" style="color: #34d399">${summary.passed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Fallidas (FAIL)</div>
        <div class="stat-val" style="color: #f87171">${summary.failed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Fallos Críticos</div>
        <div class="stat-val" style="color: ${summary.critical_failures === 0 ? '#34d399' : '#f87171'}">${summary.critical_failures}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Alucinaciones</div>
        <div class="stat-val" style="color: ${summary.hallucinations_detected === 0 ? '#34d399' : '#f87171'}">${summary.hallucinations_detected}</div>
      </div>
    </div>

    <div class="test-list">
      ${summary.results.map((t) => `
        <div class="test-card ${t.status === 'PASS' ? 'pass' : 'fail'}">
          <div class="test-header">
            <div>
              <span class="test-id">${t.id}</span>
              <span class="test-title">${t.name}</span>
            </div>
            <span class="test-sev sev-${t.severity.toLowerCase()}">${t.severity}</span>
          </div>
          <div class="conv-box">
            ${t.user_messages.map((u, i) => `
              <div class="msg-user">👤 <strong>Cliente:</strong> ${u}</div>
              <div class="msg-bot">🤖 <strong>Santiago Papelería:</strong>\n${t.bot_responses[i] || '(Sin respuesta)'}</div>
            `).join('')}
            ${t.failure_reason ? `<div class="fail-alert">⚠️ <strong>Motivo del fallo:</strong> ${t.failure_reason}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf-8');
}
