// Servicio de pedidos
import { Pedido, Cotizacion, PedidoItem } from '../domain/entities';
import { guardarPedido, getPedidos } from '../adapters/pedidoAdapter';

export function crearPedido(cotizacion: Cotizacion, clienteNombre: string, clienteTelefono: string): Pedido {
  const accionPendiente = cotizacion.ambiguos.length > 0
    ? 'Revisar ítems no identificados'
    : 'Verificar pago recibido';

  const pedido: Pedido = {
    id: `ped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: cotizacion.tenantId,
    clienteNombre,
    clienteTelefono,
    items: cotizacion.items,
    total: cotizacion.total,
    estado: 'necesita_revision',
    accionPendiente,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  };

  guardarPedido(pedido);
  return pedido;
}

export function obtenerPedidos(tenantId: string): Pedido[] {
  return getPedidos(tenantId);
}
