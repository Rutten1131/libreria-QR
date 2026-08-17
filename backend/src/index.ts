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

// ============================================================
// PANEL TENANT — INVENTARIO
// ============================================================

// GET /api/tenants/:tenantId/productos — listar productos del tenant
app.get('/api/tenants/:tenantId/productos', async (req, res) => {
  try {
    const sb = getSupabase();
    const { tenantId } = req.params;
    const { data, error } = await sb
      .from('productos')
      .select('id, nombre, familia, precio, stock_cantidad, disponible')
      .eq('tenant_id', tenantId)
      .order('nombre', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(
      (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        familia: p.familia || 'general',
        precio: Number(p.precio),
        disponible: p.disponible ?? (p.stock_cantidad > 0),
      }))
    );
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/tenants/:tenantId/inventario/importar — importar desde Excel (JSON normalizado)
app.post('/api/tenants/:tenantId/inventario/importar', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items (array) es requerido' });
    }
    const resultado = await cargarInventario({ tenant_id: tenantId, items });
    return res.json(resultado);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// POST /api/tenants/:tenantId/productos/:id/toggle — alternar disponible/agotado
app.post('/api/tenants/:tenantId/productos/:id/toggle', async (req, res) => {
  try {
    const sb = getSupabase();
    const { tenantId, id } = req.params;
    const { disponible } = req.body;
    const stock = disponible ? 10 : 0;
    const { data, error } = await sb
      .from('productos')
      .update({ stock_cantidad: stock })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('id, disponible, stock_cantidad')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, producto: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
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
// WHATSAPP CONNECT (Superadmin y Panel Tenant)
// ============================================================
import { conectarWhatsapp, whatsappQR, whatsappStatus, desconectarWhatsapp } from './api/whatsappConnect';

// Rutas de administración (operador)
app.post('/api/admin/tenants/:id/whatsapp/conectar', requireOperador, conectarWhatsapp);
app.get('/api/admin/tenants/:id/whatsapp/qr', requireOperador, whatsappQR);
app.get('/api/admin/tenants/:id/whatsapp/status', requireOperador, whatsappStatus);
app.delete('/api/admin/tenants/:id/whatsapp', requireOperador, desconectarWhatsapp);

// Rutas directas para el panel de papelería (tenant)
app.get('/api/tenants/:id/whatsapp', verWhatsappTenant as any);
app.post('/api/tenants/:id/whatsapp/conectar', conectarWhatsapp as any);
app.get('/api/tenants/:id/whatsapp/qr', whatsappQR as any);
app.get('/api/tenants/:id/whatsapp/status', whatsappStatus as any);
app.delete('/api/tenants/:id/whatsapp', desconectarWhatsapp as any);

// ============================================================
// PUBLIC TENANT LOOKUP (para login/acceso del panel de papelería)
// ============================================================
import { getSupabase } from './adapters/supabaseClient';

app.get('/api/public/tenants/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    const { data, error } = await sb
      .from('tenants')
      .select('id, nombre, telefono, direccion')
      .or(`id.eq.${id},telefono.eq.${id}`)
      .maybeSingle();
    if (error || !data) return res.status(404).json({ error: 'Librería no encontrada' });
    return res.json({ tenant: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/whatsapp/webhook — webhook unificado de Evolution API
// El tenant se discrimina por payload.instance → tenant_whatsapp en BD
app.post('/api/whatsapp/webhook', async (req, res) => {
  const { webhookWhatsapp } = await import('./api/whatsappWebhook');
  return webhookWhatsapp(req, res);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LibreríaQR backend escuchando en http://localhost:${PORT}`);
});
