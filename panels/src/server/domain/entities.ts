// Domain entities

export interface Producto {
  id: string;
  nombre: string;
  familia: string; // familia de variante, ej. "compás", "lápiz", "cuaderno"
  precio: number;
  disponible: boolean;
  tenantId: string;
}

export interface Variante {
  id: string;
  productoId: string;
  nombre: string; // ej. " Faber Castel", "Norma", "Moscow"
  precioAdicional: number;
}

export interface Pedido {
  id: string;
  tenantId: string;
  clienteNombre: string;
  clienteTelefono: string;
  items: PedidoItem[];
  total: number;
  estado: 'necesita_revision' | 'confirmado' | 'pagado' | 'despachado' | 'cancelado';
  accionPendiente: string; // ej. "Confirmar variante", "Verificar pago recibido"
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface PedidoItem {
  productoId: string;
  nombre: string;
  variante?: string;
  cantidad: number;
  precioUnitario: number;
  matchConfidence: 'alta' | 'baja';
}

export interface Tenant {
  id: string;
  nombre: string; // "Librería El Sol"
  telefono: string;
  direccion: string;
}

export interface Cotizacion {
  tenantId: string;
  items: PedidoItem[];
  total: number;
  ambiguos: string[]; // textos que no se pudieron emparejar
}
