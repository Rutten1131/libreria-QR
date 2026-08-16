// Adapter de inventario — datos seed de "Librería El Sol"
import { Producto } from '../domain/entities';

// Inventario seed — una papelería ficticia para el piloto
const INVENTARIO: Record<string, Producto[]> = {
  libreria_el_sol: [
    { id: 'p1', nombre: 'Cuaderno college', familia: 'cuaderno', precio: 2.50, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p2', nombre: 'Cuaderno Universitarios', familia: 'cuaderno', precio: 3.00, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p3', nombre: 'Lápiz 2B', familia: 'lapiz', precio: 0.50, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p4', nombre: 'Lápiz HB', familia: 'lapiz', precio: 0.40, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p5', nombre: 'Borrador blanco', familia: 'borrador', precio: 0.30, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p6', nombre: 'Regla 30cm', familia: 'regla', precio: 0.80, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p7', nombre: 'Tijeras escolar', familia: 'tijeras', precio: 1.20, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p8', nombre: 'Pegamento barra', familia: 'pegamento', precio: 0.70, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p9', nombre: 'Sacapuntas metálico', familia: 'sacapuntas', precio: 0.60, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p10', nombre: 'Compás Faber', familia: 'compas', precio: 2.00, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p11', nombre: 'Compás Norma', familia: 'compas', precio: 1.80, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p12', nombre: 'Transportador 180°', familia: 'transportador', precio: 0.50, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p13', nombre: 'Escuadra 45°', familia: 'escuadra', precio: 0.60, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p14', nombre: 'Cartulina blanca', familia: 'cartulina', precio: 0.25, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p15', nombre: 'Papel craft', familia: 'papel', precio: 0.15, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p16', nombre: 'Resaltador amarillo', familia: 'resaltador', precio: 0.80, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p17', nombre: 'Corrector blanco', familia: 'corrector', precio: 1.00, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p18', nombre: 'Agenda 2026', familia: 'agenda', precio: 5.00, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p19', nombre: 'Folder manila', familia: 'folder', precio: 0.20, disponible: true, tenantId: 'libreria_el_sol' },
    { id: 'p20', nombre: 'Bolso escolar', familia: 'bolso', precio: 8.00, disponible: false, tenantId: 'libreria_el_sol' },
  ],
};

export function getInventario(tenantId: string): Producto[] {
  return INVENTARIO[tenantId] || [];
}

export function getAllTenants(): string[] {
  return Object.keys(INVENTARIO);
}
