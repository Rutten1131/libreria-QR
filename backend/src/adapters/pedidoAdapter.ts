// Adapter de pedidos —存储 en memoria (para el piloto)
import { Pedido } from '../domain/entities';

const pedidos: Pedido[] = [];

export function guardarPedido(pedido: Pedido): void {
  pedidos.push(pedido);
}

export function getPedidos(tenantId: string): Pedido[] {
  return pedidos.filter(p => p.tenantId === tenantId);
}

export function getPedidoPorId(id: string): Pedido | undefined {
  return pedidos.find(p => p.id === id);
}
