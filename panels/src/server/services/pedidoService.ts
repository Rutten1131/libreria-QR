// Servicio de pedidos — Supabase
import { Cotizacion, Pedido } from '../domain/entities';
import { guardarPedido, getPedidos } from '../adapters/pedidoAdapter';

export async function crearPedido(
  cotizacion: Cotizacion,
  clienteNombre: string,
  clienteTelefono: string,
  canal: 'whatsapp' | 'web' = 'whatsapp'
): Promise<Pedido> {
  const accionPendiente = cotizacion.ambiguos.length > 0
    ? 'Confirmar variante o reescribir lista'
    : 'Verificar pago recibido';

  return guardarPedido({
    tenantId: cotizacion.tenantId,
    clienteNombre,
    clienteTelefono,
    canal,
    items: cotizacion.items,
    total: cotizacion.total,
    accionPendiente,
    itemsAmbiguos: cotizacion.ambiguos,
  });
}

export async function obtenerPedidos(tenantId: string): Promise<Pedido[]> {
  return getPedidos(tenantId);
}
