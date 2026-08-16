// Entry point — Backend LibreríaQR
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { cotizar } from './services/matchingService';
import { crearPedido, obtenerPedidos } from './services/pedidoService';
import { cargarInventario } from './services/inventarioService';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// POST /api/cotizar — recibe { tenantId, lista: string[] }
app.post('/api/cotizar', async (req, res) => {
  try {
    const { tenantId, lista } = req.body as { tenantId: string; lista: string[] };
    if (!tenantId || !lista || !Array.isArray(lista)) {
      return res.status(400).json({ error: 'tenantId y lista (array) son requeridos' });
    }
    const cotizacion = await cotizar(tenantId, lista);
    return res.json(cotizacion);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/pedido — recibe { cotizacion, clienteNombre, clienteTelefono, canal? }
app.post('/api/pedido', async (req, res) => {
  try {
    const { cotizacion, clienteNombre, clienteTelefono, canal } = req.body;
    if (!cotizacion || !clienteNombre || !clienteTelefono) {
      return res.status(400).json({ error: 'cotizacion, clienteNombre y clienteTelefono son requeridos' });
    }
    const pedido = await crearPedido(
      cotizacion,
      clienteNombre,
      clienteTelefono,
      canal === 'web' ? 'web' : 'whatsapp'
    );
    return res.json(pedido);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/pedidos?tenantId=xxx
app.get('/api/pedidos', async (req, res) => {
  try {
    const { tenantId } = req.query as { tenantId?: string };
    if (!tenantId) return res.status(400).json({ error: 'tenantId es requerido' });
    const pedidos = await obtenerPedidos(tenantId);
    return res.json(pedidos);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/inventario/cargar — carga inventario validado
app.post('/api/admin/inventario/cargar', async (req, res) => {
  try {
    const resultado = await cargarInventario(req.body);
    return res.json(resultado);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// POST /api/whatsapp/webhook — webhook unificado de Evolution API
// El tenant se discrimina por payload.instance → tenant_whatsapp en BD
app.post('/api/whatsapp/webhook', async (req, res) => {
  const { webhookWhatsapp } = await import('./api/whatsappWebhook');
  return webhookWhatsapp(req, res);
});

// ============================================================
// AUTH (operador)
// ============================================================
import { postMagicLink, postVerifyOTP, getMe, requireOperador } from './api/auth';
app.post('/api/auth/magic-link', postMagicLink);
app.post('/api/auth/verify', postVerifyOTP);
app.get('/api/auth/me', requireOperador, getMe);

// ============================================================
// ADMIN (operador autenticado)
// ============================================================
import { listarTenants, crearTenant, verTenant, verWhatsappTenant } from './api/admin';
app.get('/api/admin/tenants', requireOperador, listarTenants);
app.post('/api/admin/tenants', requireOperador, crearTenant);
app.get('/api/admin/tenants/:id', requireOperador, verTenant);
app.get('/api/admin/tenants/:id/whatsapp', requireOperador, verWhatsappTenant);

// ============================================================
// WHATSAPP CONNECT (operador autenticado)
// ============================================================
import { conectarWhatsapp, whatsappQR, whatsappStatus, desconectarWhatsapp } from './api/whatsappConnect';
app.post('/api/admin/tenants/:id/whatsapp/conectar', requireOperador, conectarWhatsapp);
app.get('/api/admin/tenants/:id/whatsapp/qr', requireOperador, whatsappQR);
app.get('/api/admin/tenants/:id/whatsapp/status', requireOperador, whatsappStatus);
app.delete('/api/admin/tenants/:id/whatsapp', requireOperador, desconectarWhatsapp);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LibreríaQR backend escuchando en http://localhost:${PORT}`);
});
