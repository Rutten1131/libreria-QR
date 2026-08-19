/**
 * Tipos compartidos por las pantallas del panel.
 * Mantener en sync con el backend (backend/src/domain/*).
 */

export type EstadoPedido =
  | 'necesita_revision'
  | 'confirmado'
  | 'pagado'
  | 'despachado';

export interface ItemPedido {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  tenant_id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: EstadoPedido;
  items: ItemPedido[];
  total: number;
  created_at: string;
  updated_at: string;
  accion_pendiente?: string; // ej. "Confirmar variante", "Verificar pago"
  advertencia?: string;       // ej. "Stock bajo en 2 items"
  items_ambiguos?: string[];
}

export interface Producto {
  id: string;
  nombre: string;
  familia: string;
  precio: number;
  disponible: boolean;
  variantes?: string[];
}

export interface Comanda {
  pedido_id: string;
  cliente: string;
  direccion: string;
  items: { nombre: string; cantidad: number }[];
  tomado_por?: string;
  created_at: string;
}
