// Servicio de pedidos — Supabase
import { Cotizacion, Pedido } from '../domain/entities';
import { guardarPedido, getPedidos } from '../adapters/pedidoAdapter';

export async function crearPedido(
  cotizacion: any,
  clienteNombre: string,
  clienteTelefono: string,
  canal: 'whatsapp' | 'web' = 'whatsapp'
): Promise<Pedido> {
  const ambiguos = Array.isArray(cotizacion?.ambiguos)
    ? cotizacion.ambiguos
    : Array.isArray(cotizacion?.items)
    ? cotizacion.items.filter((i: any) => !i.disponible).map((i: any) => i.item || i.nombre)
    : [];

  const accionPendiente = ambiguos.length > 0
    ? 'Confirmar variante o reescribir lista'
    : 'Verificar pago recibido';

  return guardarPedido({
    tenantId: cotizacion?.tenantId || 'libreria_prueba',
    clienteNombre,
    clienteTelefono,
    canal,
    items: cotizacion?.items || [],
    total: Number(cotizacion?.total || 0),
    accionPendiente,
    itemsAmbiguos: ambiguos,
  });
}

export async function obtenerPedidos(tenantId: string): Promise<Pedido[]> {
  return getPedidos(tenantId);
}
