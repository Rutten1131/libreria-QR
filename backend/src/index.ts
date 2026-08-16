// Entry point — Backend LibreríaQR
import express from 'express';
import cors from 'cors';
import { cotizar } from './services/matchingService';
import { crearPedido, obtenerPedidos } from './services/pedidoService';
import { getAllTenants } from './adapters/inventarioAdapter';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// POST /cotizar — recibe { tenantId, lista: string[] }
app.post('/api/cotizar', (req, res) => {
  const { tenantId, lista } = req.body as { tenantId: string; lista: string[] };
  if (!tenantId || !lista || !Array.isArray(lista)) {
    return res.status(400).json({ error: 'tenantId y lista (array) son requeridos' });
  }
  const cotizacion = cotizar(tenantId, lista);
  return res.json(cotizacion);
});

// POST /pedido — recibe { cotizacion, clienteNombre, clienteTelefono }
app.post('/api/pedido', (req, res) => {
  const { cotizacion, clienteNombre, clienteTelefono } = req.body;
  if (!cotizacion || !clienteNombre || !clienteTelefono) {
    return res.status(400).json({ error: 'cotizacion, clienteNombre y clienteTelefono son requeridos' });
  }
  const pedido = crearPedido(cotizacion, clienteNombre, clienteTelefono);
  return res.json(pedido);
});

// GET /pedidos?tenantId=xxx
app.get('/api/pedidos', (req, res) => {
  const { tenantId } = req.query as { tenantId?: string };
  if (!tenantId) return res.status(400).json({ error: 'tenantId es requerido' });
  const pedidos = obtenerPedidos(tenantId);
  return res.json(pedidos);
});

// GET /tenants — lista tenants disponibles (para demo)
app.get('/api/tenants', (_req, res) => {
  res.json(getAllTenants());
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LibreríaQR backend escuchando en http://localhost:${PORT}`);
});
