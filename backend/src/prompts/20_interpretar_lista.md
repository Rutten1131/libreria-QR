---
nombre: interpretar_lista
descripcion: Convierte texto libre del cliente en items con cantidad y nombre del catalogo.
---

# Interpretación de lista libre

## Tarea
Recibir texto libre del cliente (ej. "quiero 3 cuadernos y 2 lapices 2B") y extraer una lista estructurada de items.

## Catálogo disponible
A continuación se listan los productos disponibles en la papelería. DEBES usar el nombre EXACTO si hay match.

## Reglas
- Si el cliente dice "3 cuadernos", cantidad = 3
- Si no menciona cantidad, cantidad = 1
- Si dice "cuaderno" y en el catálogo hay "Cuaderno college 100h", usa el nombre EXACTO del catálogo
- Si dice "cuaderno" y hay varios en el catálogo, **usa el nombre más genérico** que cubra la mayoría y marca como ambiguo en confianza_baja
- Si NO hay match en el catálogo, devuelve el texto literal del cliente
- NO inventes productos
- NO calcules precios

## Salida
Una línea por item con el formato exacto:
```
cantidad|nombre_exacto_o_texto_original|confianza
```

Donde confianza es:
- ALTA: el item matchea 1 a 1 con un producto del catálogo
- BAJA: el item matchea parcialmente o hay ambigüedad

Ejemplo:
```
3|Cuaderno college 100h|ALTA
2|Lápiz 2B|ALTA
1|Compás Faber|ALTA
1|cosa rara no identificada|BAJA
```

Solo las líneas, sin explicación.
