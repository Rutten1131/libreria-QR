'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { extractPagesFromPdf } from '@/lib/pdfHelper';
import { descargarProformaDirectoPdf } from '@/lib/generateProformaPdf';

interface TenantInfo {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
}

interface ItemCotizado {
  item: string;
  producto_id: string | null;
  nombre_encontrado: string | null;
  precio_unitario: number;
  disponible: boolean;
  cantidad: number;
}

interface CotizacionResponse {
  items: ItemCotizado[];
  total: number;
  totalItems: number;
  encontrados: number;
}

interface FotoItem {
  id: string;
  file: File;
  previewUrl: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function PedirWebPage() {
  const params = useParams();
  const tenantId = (params?.tenantId as string) || '';

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  // Estado del flujo
  const [paso, setPaso] = useState<'subir' | 'cotizando' | 'resumen' | 'confirmado'>('subir');
  const [modoTexto, setModoTexto] = useState(false);
  const [textoLista, setTextoLista] = useState('');
  
  // Soporte de múltiples fotos y PDFs
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [procesandoPdf, setProcesandoPdf] = useState(false);

  // Cotización
  const [cotizacion, setCotizacion] = useState<CotizacionResponse | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de la papelería
  useEffect(() => {
    if (!tenantId) return;
    fetch(`${API_URL}/api/public/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) {
          setTenant(data.tenant);
        } else {
          setTenant({ id: tenantId, nombre: tenantId.replace(/_/g, ' ') });
        }
      })
      .catch(() => {
        setTenant({ id: tenantId, nombre: tenantId.replace(/_/g, ' ') });
      })
      .finally(() => setLoadingTenant(false));
  }, [tenantId]);

  // Si viene con ?pedido=id, cargar la cotización de ese pedido existente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoParam = urlParams.get('pedido');
    if (!pedidoParam) return;

    fetch(`${API_URL}/api/pedidos/${pedidoParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return;

        const itemsDisponibles: ItemCotizado[] = (data.items || []).map((it: any) => ({
          item: it.nombre,
          producto_id: it.producto_id,
          nombre_encontrado: it.nombre,
          precio_unitario: Number(it.precio_unitario || 0),
          disponible: true,
          cantidad: Number(it.cantidad || 1),
        }));

        const itemsAmbiguos: ItemCotizado[] = (data.items_ambiguos || []).map((amb: string) => ({
          item: amb,
          producto_id: null,
          nombre_encontrado: null,
          precio_unitario: 0,
          disponible: false,
          cantidad: 1,
        }));

        const todosLosItems = [...itemsDisponibles, ...itemsAmbiguos];

        setCotizacion({
          items: todosLosItems,
          total: Number(data.total || 0),
          totalItems: todosLosItems.length,
          encontrados: itemsDisponibles.length,
        });

        setPedidoId(data.id);
        if (data.cliente_nombre) setClienteNombre(data.cliente_nombre);
        if (data.cliente_telefono) setClienteTelefono(data.cliente_telefono);

        if (data.estado === 'confirmado' || data.estado === 'despachado') {
          setPaso('confirmado');
        } else {
          setPaso('resumen');
        }
      })
      .catch((e) => console.warn('[Error cargando pedido existente]', e));
  }, []);

  // Manejar selección / toma de fotos y documentos PDF
  const handleFilesAdd = async (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    if (arr.length === 0) return;
    setError(null);

    const nuevasFotos: FotoItem[] = [];

    for (const f of arr) {
      const esPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

      if (esPdf) {
        setProcesandoPdf(true);
        try {
          // Extraer cada página del PDF como una imagen JPEG independiente
          const paginasPdf = await extractPagesFromPdf(f);
          for (const pag of paginasPdf) {
            const pageFile = new File([pag.blob], pag.name, { type: 'image/jpeg' });
            nuevasFotos.push({
              id: Math.random().toString(36).substring(2, 9),
              file: pageFile,
              previewUrl: pag.previewUrl,
            });
          }
        } catch (err: any) {
          console.warn('[Error extrayendo páginas PDF]', err.message);
          setError('No pudimos leer el PDF directamente. Intenta tomarle foto con la cámara.');
        } finally {
          setProcesandoPdf(false);
        }
      } else if (f.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(f);
        nuevasFotos.push({
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          previewUrl,
        });
      }
    }

    if (nuevasFotos.length > 0) {
      setFotos((prev) => [...prev, ...nuevasFotos]);
    }
  };

  const handleEliminarFoto = (id: string) => {
    setFotos((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Si no es imagen (ej. PDF), leer directamente
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;

      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Calidad 70% (~60KB por foto, ultra ligero y nítido para OCR)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.70);
        console.log(`[Foto Comprimida] Original: ${(file.size / 1024).toFixed(0)}KB -> Comprimido: ${(compressedBase64.length / 1024).toFixed(0)}KB`);
        resolve(compressedBase64);
      };

      reader.readAsDataURL(file);
    });
  };

  // Comprimir imagen a Blob ligero (~100KB) antes de subir a Storage
  const comprimirABlob = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => resolve(file);
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Subida directa del navegador a Supabase Storage
  const subirFotoDirectoASupabase = async (file: File): Promise<string | null> => {
    try {
      const signRes = await fetch(`${API_URL}/api/upload/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: 'image/jpeg' }),
      });
      if (!signRes.ok) return null;
      const { signedUploadUrl, publicUrl } = await signRes.json();
      if (!signedUploadUrl || !publicUrl) return null;

      const blob = await comprimirABlob(file);

      const uploadRes = await fetch(signedUploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: blob,
      });

      if (uploadRes.ok) {
        console.log('[Supabase Storage Directo] Subida exitosa:', publicUrl);
        return publicUrl;
      }
      return null;
    } catch (e: any) {
      console.warn('[Supabase Storage Upload Warning]', e.message);
      return null;
    }
  };

  // Procesar cotización
  const handleCotizar = async () => {
    setError(null);
    setPaso('cotizando');

    try {
      let bodyData: any = {
        tenantId: tenant?.id || tenantId,
      };

      if (modoTexto) {
        const lineas = textoLista
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lineas.length === 0) {
          setError('Por favor escribe tu lista con al menos un artículo.');
          setPaso('subir');
          return;
        }
        bodyData.lista = lineas;
      } else {
        if (fotos.length === 0) {
          setError('Por favor toma o sube al menos una foto de tu lista escolar.');
          setPaso('subir');
          return;
        }

        // 1. Subida directa a Supabase Storage (petición a Vercel pesará menos de 0.2 KB)
        const uploadPromises = fotos.map((f) => subirFotoDirectoASupabase(f.file));
        const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

        if (uploadedUrls.length > 0) {
          bodyData.imageUrls = uploadedUrls;
        } else {
          // Fallback a base64 comprimido
          const base64List = (await Promise.all(fotos.map((f) => fileToBase64(f.file)))).filter((b) => b && b.length > 50);
          if (base64List.length === 0) {
            setError('No se pudo procesar la imagen. Intenta con otra foto o escribe la lista en texto.');
            setPaso('subir');
            return;
          }
          bodyData.imagenes = base64List;
        }
      }

      const res = await fetch(`${API_URL}/api/cotizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cotizar la lista');
      }

      const data = await res.json();

      // Si ya existía una cotización previa y estamos agregando más cosas, combinamos los items
      setCotizacion((prev) => {
        if (!prev || !prev.items || prev.items.length === 0) {
          return data;
        }

        const itemsCombinados = [...prev.items, ...(data.items || [])];
        const encontrados = itemsCombinados.filter((i) => i.disponible).length;
        const total = itemsCombinados.reduce(
          (sum, i) => sum + (i.disponible ? i.precio_unitario * (i.cantidad || 1) : 0),
          0
        );

        return {
          items: itemsCombinados,
          total,
          totalItems: itemsCombinados.length,
          encontrados,
        };
      });

      setPaso('resumen');
    } catch (e: any) {
      setError(e.message || 'No se pudo cotizar la lista. Intenta nuevamente.');
      setPaso('subir');
    }
  };

  // Enviar / Confirmar pedido
  const handleConfirmarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      setError('Por favor ingresa tu nombre y número de WhatsApp para confirmar.');
      return;
    }

    setEnviandoPedido(true);
    setError(null);

    try {
      if (pedidoId) {
        // 1. Si el pedido ya fue creado (ej. vino de WhatsApp con ?pedido=ID), lo actualizamos a confirmado
        const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estado: 'confirmado',
            clienteNombre: clienteNombre.trim(),
            clienteTelefono: clienteTelefono.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al confirmar el pedido');
        }

        setPaso('confirmado');
      } else {
        // 2. Si es un pedido nuevo creado directamente en la web
        const res = await fetch(`${API_URL}/api/pedido`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cotizacion: {
              ...cotizacion,
              tenantId: tenant?.id || tenantId || 'libreria_prueba',
              ambiguos: cotizacion?.items?.filter((i) => !i.disponible).map((i) => i.item) || [],
            },
            clienteNombre: clienteNombre.trim(),
            clienteTelefono: clienteTelefono.trim(),
            canal: 'web',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al registrar el pedido');
        }

        const data = await res.json();
        setPedidoId(data.id || 'PED-' + Math.floor(1000 + Math.random() * 9000));
        setPaso('confirmado');
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo confirmar el pedido. Intenta nuevamente.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Generar y descargar proforma directa en archivo PDF (sin precios unitarios)
  const descargarPdfProforma = () => {
    if (!cotizacion) return;

    const itemsDisponibles = cotizacion.items
      .filter((i) => i.disponible)
      .map((i) => ({
        nombre: i.nombre_encontrado || i.item,
        cantidad: i.cantidad || 1,
      }));

    const itemsFaltantes = cotizacion.items
      .filter((i) => !i.disponible)
      .map((i) => ({
        nombre: i.item,
      }));

    descargarProformaDirectoPdf({
      nombreLibreria: tenant?.nombre || 'Librería & Papelería',
      telefonoLibreria: tenant?.telefono,
      direccionLibreria: tenant?.direccion,
      pedidoId: pedidoId || undefined,
      clienteNombre: clienteNombre.trim() || undefined,
      clienteTelefono: clienteTelefono.trim() || undefined,
      itemsDisponibles,
      itemsFaltantes,
      total: cotizacion.total,
    });
  };

  if (loadingTenant) {
    return (
      <div className="lqr-web-portal-loading">
        <div className="lqr-spinner" />
        <p>Cargando portal de pedidos...</p>
      </div>
    );
  }

  const nombreLibreria = tenant?.nombre || 'Librería & Papelería';

  return (
    <div className="lqr-web-portal-root">
      {/* ── HEADER DE TIENDA ── */}
      <header className="lqr-portal-header">
        <div className="lqr-portal-header__inner">
          <div className="lqr-store-brand">
            <div className="lqr-store-icon">📚</div>
            <div>
              <h1 className="lqr-store-title">{nombreLibreria}</h1>
              <p className="lqr-store-subtitle">Portal Oficial de Cotizaciones & Pedidos</p>
            </div>
          </div>
          {tenant?.telefono && (
            <div className="lqr-store-badge">
              <span className="lqr-pulse-dot" />
              WhatsApp: +{tenant.telefono}
            </div>
          )}
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <div className="lqr-portal-hero">
        <div className="lqr-portal-hero__inner">
          <h2 className="lqr-hero-headline">Cotiza tu Lista Escolar al Instante</h2>
          <p className="lqr-hero-desc">
            Sube las fotos de tu lista escolar (una o varias páginas) o escribe los útiles. Nuestro sistema calcula tu presupuesto exacto en segundos con el inventario real de <strong>{nombreLibreria}</strong>.
          </p>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="lqr-portal-main">
        <div className="lqr-portal-card-wrap">
          {/* Mensajes de error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="lqr-alert-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PASO 1: SUBIR LISTA O FOTOS ── */}
          {paso === 'subir' && (
            <div className="lqr-step-card">
              <div className="lqr-mode-switch">
                <button
                  type="button"
                  className={`lqr-mode-btn ${!modoTexto ? 'lqr-mode-btn--active' : ''}`}
                  onClick={() => setModoTexto(false)}
                >
                  📸 Tomar Fotos o Subir Imágenes ({fotos.length})
                </button>
                <button
                  type="button"
                  className={`lqr-mode-btn ${modoTexto ? 'lqr-mode-btn--active' : ''}`}
                  onClick={() => setModoTexto(true)}
                >
                  ✍️ Escribir Lista en Texto
                </button>
              </div>

              {!modoTexto ? (
                /* Subida de fotos (Múltiples páginas) */
                <div className="lqr-photos-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="lqr-hidden-input"
                    onChange={(e) => {
                      if (e.target.files) handleFilesAdd(e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {fotos.length === 0 ? (
                    <div
                      className="lqr-file-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="lqr-dropzone-content">
                        <div className="lqr-dropzone-icon">📷</div>
                        <strong>Toca aquí para tomar fotos a tu lista</strong>
                        <span>Puedes subir una o varias fotos (página 1, página 2, etc.)</span>
                        <span className="lqr-formats-pill">JPG · PNG · PDF · Soporta Varias Fotos</span>
                      </div>
                    </div>
                  ) : (
                    <div className="lqr-photos-grid-wrap">
                      <div className="lqr-photos-grid-header">
                        <span className="lqr-photos-count">
                          ✓ {fotos.length} {fotos.length === 1 ? 'foto lista' : 'fotos listas'} para cotizar
                        </span>
                        <button
                          type="button"
                          className="lqr-btn-add-more"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          + Agregar otra foto / página
                        </button>
                      </div>

                      <div className="lqr-photos-grid">
                        {fotos.map((foto, idx) => (
                          <div key={foto.id} className="lqr-photo-card">
                            {foto.previewUrl ? (
                              <img src={foto.previewUrl} alt={`Página ${idx + 1}`} className="lqr-photo-thumb" />
                            ) : (
                              <div className="lqr-pdf-thumb">📄 PDF</div>
                            )}
                            <div className="lqr-photo-overlay">
                              <span className="lqr-page-tag">Pág. {idx + 1}</span>
                              <button
                                type="button"
                                className="lqr-photo-del-btn"
                                onClick={() => handleEliminarFoto(foto.id)}
                                title="Eliminar foto"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}

                        <div
                          className="lqr-photo-add-card"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="lqr-add-icon">+</span>
                          <span>Agregar otra foto</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Entrada de texto */
                <div className="lqr-text-mode-wrap">
                  <label className="lqr-field-label">Escribe los útiles escolares (uno por línea):</label>
                  <textarea
                    className="lqr-textarea"
                    rows={6}
                    placeholder="Ejemplo:&#10;1 Cuaderno universitario 100 hojas líneas&#10;2 Lápices 2B Faber Castell&#10;1 Borrador de miga&#10;1 Regla de 30cm&#10;1 Caja de 12 colores"
                    value={textoLista}
                    onChange={(e) => setTextoLista(e.target.value)}
                  />
                </div>
              )}

              <button
                type="button"
                className="lqr-btn-submit"
                onClick={handleCotizar}
                disabled={!modoTexto && fotos.length === 0 && !textoLista.trim()}
              >
                ⚡ Cotizar mi Lista con IA →
              </button>
            </div>
          )}

          {/* ── PASO 2: ESPERANDO COTIZACIÓN ── */}
          {paso === 'cotizando' && (
            <div className="lqr-loading-card">
              <div className="lqr-ai-pulse-icon">⏳</div>
              <h3 className="lqr-loading-title">¡Espéranos un momento!</h3>
              <p className="lqr-loading-sub">
                Estamos cotizando tu lista de útiles escolares con el inventario de <strong>{nombreLibreria}</strong>. Esto puede tomar hasta 2 minutos.
              </p>
              <div className="lqr-progress-bar">
                <div className="lqr-progress-bar__fill" />
              </div>
            </div>
          )}

          {/* ── PASO 3: RESUMEN MINIMALISTA Y CONFIRMAR PEDIDO ── */}
          {paso === 'resumen' && cotizacion && (
            <div className="lqr-step-card">
              <div className="lqr-summary-header">
                <div>
                  <h3 className="lqr-summary-title">Resumen de tu Cotización</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                    Hemos procesado tu lista escolar con nuestro stock en tienda.
                  </p>
                </div>
                <div className="lqr-summary-actions-zone">
                  <button
                    type="button"
                    className="lqr-btn-pdf-header"
                    onClick={descargarPdfProforma}
                    title="Descargar proforma en archivo PDF"
                  >
                    📄 Descargar PDF
                  </button>
                </div>
              </div>

              {/* Métricas Minimalistas de la Cotización */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  margin: '20px 0',
                }}
              >
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>✅</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                    {cotizacion.encontrados}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Útiles en stock</div>
                </div>

                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>⚠️</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                    {Math.max(0, cotizacion.totalItems - cotizacion.encontrados)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>No disponibles</div>
                </div>

                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                    gridColumn: 'span 1',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>💰</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                    ${cotizacion.total.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Total estimado</div>
                </div>
              </div>

              {/* Acciones principales: Descargar PDF o Seguir Agregando */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                <button
                  type="button"
                  className="lqr-btn-pdf"
                  style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
                  onClick={descargarPdfProforma}
                >
                  📄 Descargar Proforma Oficial en PDF
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    setFotos([]);
                    setTextoLista('');
                    setPaso('subir');
                  }}
                >
                  ➕ Seguir agregando más útiles o fotos a esta cotización
                </button>
              </div>

              {/* Formulario de confirmación */}
              <form onSubmit={handleConfirmarPedido} className="lqr-order-form">
                <h4 className="lqr-form-title">Completa tus datos para preparar tu pedido:</h4>

                <div className="lqr-fields-grid">
                  <div className="lqr-field">
                    <label className="lqr-label">Tu Nombre y Apellido *</label>
                    <input
                      type="text"
                      className="lqr-input"
                      placeholder="Ej. María Pérez"
                      required
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                    />
                  </div>

                  <div className="lqr-field">
                    <label className="lqr-label">Tu Número de WhatsApp *</label>
                    <input
                      type="tel"
                      className="lqr-input"
                      placeholder="Ej. 0991234567"
                      required
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lqr-form-actions">
                  <button
                    type="submit"
                    className="lqr-btn-submit"
                    disabled={enviandoPedido}
                  >
                    {enviandoPedido ? 'Enviando pedido a la tienda...' : '📦 Confirmar y Enviar Pedido →'}
                  </button>
                  <button
                    type="button"
                    className="lqr-btn-back"
                    onClick={() => {
                      setCotizacion(null);
                      setFotos([]);
                      setTextoLista('');
                      setPaso('subir');
                    }}
                  >
                    🔄 Empezar una nueva cotización desde cero
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── PASO 4: PEDIDO CONFIRMADO ── */}
          {paso === 'confirmado' && (
            <div className="lqr-step-card lqr-confirmed-card">
              <div className="lqr-confirmed-badge">✓</div>
              <h2 className="lqr-confirmed-title">¡Pedido Recibido con Éxito!</h2>
              <p className="lqr-confirmed-desc">
                Tu pedido <strong>#{pedidoId}</strong> ha sido recibido por <strong>{nombreLibreria}</strong>.
              </p>
              <div className="lqr-confirmed-box">
                <p>Te contactaremos por WhatsApp al <strong>{clienteTelefono}</strong> para coordinar la entrega o retiro en tienda.</p>
              </div>
              <div className="lqr-confirmed-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <button
                  type="button"
                  className="lqr-btn-pdf"
                  onClick={descargarPdfProforma}
                >
                  📄 Descargar Proforma Oficial en PDF
                </button>
                <button
                  type="button"
                  className="lqr-btn-back"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setFotos([]);
                    setTextoLista('');
                    setCotizacion(null);
                    setPaso('subir');
                  }}
                >
                  Hacer otra cotización
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .lqr-web-portal-root {
          min-height: 100vh;
          background: #090d16;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .lqr-web-portal-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #090d16;
          color: #94a3b8;
          gap: 16px;
        }
        .lqr-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Header ── */
        .lqr-portal-header {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 20px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .lqr-portal-header__inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lqr-store-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lqr-store-icon {
          font-size: 26px;
          line-height: 1;
        }
        .lqr-store-title {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: #ffffff;
          letter-spacing: -0.2px;
        }
        .lqr-store-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }
        .lqr-store-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 5px 10px;
          border-radius: 9999px;
        }
        .lqr-pulse-dot {
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
        }

        /* ── Hero ── */
        .lqr-portal-hero {
          padding: 32px 20px 20px;
          text-align: center;
          background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
        }
        .lqr-portal-hero__inner {
          max-width: 580px;
          margin: 0 auto;
        }
        .lqr-hero-headline {
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 10px 0;
          letter-spacing: -0.4px;
        }
        .lqr-hero-desc {
          font-size: 13px;
          line-height: 1.5;
          color: #94a3b8;
          margin: 0;
        }

        /* ── Main Layout ── */
        .lqr-portal-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 10px 16px 60px;
        }
        .lqr-portal-card-wrap {
          position: relative;
        }
        .lqr-step-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
        }

        /* ── Mode Switch ── */
        .lqr-mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .lqr-mode-btn {
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          background: transparent;
          color: #94a3b8;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lqr-mode-btn--active {
          background: #10b981;
          color: #000;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
        }

        /* ── File Dropzone ── */
        .lqr-hidden-input {
          display: none;
        }
        .lqr-file-dropzone {
          border: 2px dashed rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.03);
          border-radius: 14px;
          padding: 36px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
        }
        .lqr-file-dropzone:hover {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.06);
        }
        .lqr-dropzone-icon {
          font-size: 38px;
          margin-bottom: 10px;
        }
        .lqr-dropzone-content strong {
          display: block;
          font-size: 15px;
          color: #ffffff;
          margin-bottom: 4px;
        }
        .lqr-dropzone-content span {
          display: block;
          font-size: 12px;
          color: #94a3b8;
        }
        .lqr-formats-pill {
          display: inline-block;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 10px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 9999px;
          color: #64748b;
        }

        /* ── Multi-Photos Grid ── */
        .lqr-photos-grid-wrap {
          margin-bottom: 20px;
        }
        .lqr-photos-grid-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .lqr-photos-count {
          font-size: 13px;
          font-weight: 800;
          color: #34d399;
        }
        .lqr-btn-add-more {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .lqr-btn-add-more:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        .lqr-photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
        }
        .lqr-photo-card {
          position: relative;
          aspect-ratio: 3/4;
          border-radius: 12px;
          overflow: hidden;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .lqr-photo-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .lqr-pdf-thumb {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #94a3b8;
        }
        .lqr-photo-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
        }
        .lqr-page-tag {
          font-size: 10px;
          font-weight: 800;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .lqr-photo-del-btn {
          background: #ef4444;
          color: #fff;
          border: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
        }
        .lqr-photo-del-btn:hover {
          transform: scale(1.15);
        }
        .lqr-photo-add-card {
          aspect-ratio: 3/4;
          border-radius: 12px;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          padding: 8px;
        }
        .lqr-photo-add-card:hover {
          border-color: #10b981;
          color: #34d399;
          background: rgba(16, 185, 129, 0.05);
        }
        .lqr-add-icon {
          font-size: 24px;
          line-height: 1;
        }

        /* ── Text Mode ── */
        .lqr-text-mode-wrap {
          margin-bottom: 20px;
        }
        .lqr-field-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .lqr-textarea {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px;
          color: #ffffff;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        }
        .lqr-textarea:focus {
          border-color: #10b981;
        }

        /* ── Buttons ── */
        .lqr-btn-submit {
          width: 100%;
          padding: 14px 20px;
          background: #10b981;
          color: #000;
          font-size: 15px;
          font-weight: 800;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
          transition: filter 0.15s, transform 0.1s;
        }
        .lqr-btn-submit:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .lqr-btn-submit:active:not(:disabled) {
          transform: scale(0.98);
        }
        .lqr-btn-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lqr-btn-back {
          width: 100%;
          padding: 10px;
          background: transparent;
          color: #94a3b8;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        .lqr-btn-back:hover {
          color: #ffffff;
        }

        /* ── Loading Step ── */
        .lqr-loading-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 40px 24px;
          text-align: center;
        }
        .lqr-ai-pulse-icon {
          font-size: 48px;
          animation: pulse 1.5s ease-in-out infinite;
          margin-bottom: 16px;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .lqr-loading-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 8px 0;
        }
        .lqr-loading-sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 440px;
          margin: 0 auto 24px;
          line-height: 1.5;
        }
        .lqr-progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          overflow: hidden;
          max-width: 300px;
          margin: 0 auto;
        }
        .lqr-progress-bar__fill {
          height: 100%;
          width: 60%;
          background: #10b981;
          border-radius: 9999px;
          animation: indeterminate 1.5s infinite ease-in-out;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }

        /* ── Summary Step ── */
        .lqr-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .lqr-summary-title {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
        }
        .lqr-summary-count {
          font-size: 12px;
          color: #34d399;
          font-weight: 600;
        }
        .lqr-summary-actions-zone {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lqr-btn-pdf-header {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .lqr-btn-pdf-header:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
        }
        .lqr-btn-pdf {
          width: 100%;
          padding: 12px 18px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 12px;
          color: #38bdf8;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
        }
        .lqr-btn-pdf:hover {
          background: rgba(56, 189, 248, 0.22);
          border-color: #38bdf8;
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2);
        }
        .lqr-summary-total-badge {
          text-align: right;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 8px 14px;
          border-radius: 12px;
        }
        .lqr-summary-total-badge span {
          display: block;
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .lqr-summary-total-badge strong {
          display: block;
          font-size: 20px;
          color: #34d399;
          font-weight: 900;
        }

        /* ── Items List ── */
        .lqr-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .lqr-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          gap: 12px;
        }
        .lqr-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lqr-item-name {
          font-size: 13px;
          color: #ffffff;
        }
        .lqr-item-orig {
          font-size: 11px;
          color: #64748b;
        }
        .lqr-item-price {
          font-size: 14px;
          font-weight: 700;
          color: #34d399;
        }
        .lqr-item-out {
          font-size: 11px;
          font-weight: 700;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* ── Order Form ── */
        .lqr-form-title {
          font-size: 13px;
          font-weight: 700;
          color: #cbd5e1;
          margin: 0 0 12px 0;
        }
        .lqr-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 520px) {
          .lqr-fields-grid {
            grid-template-columns: 1fr;
          }
        }
        .lqr-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lqr-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
        }
        .lqr-input {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 12px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
        }
        .lqr-input:focus {
          border-color: #10b981;
        }

        /* ── Confirmed Step ── */
        .lqr-confirmed-card {
          text-align: center;
          padding: 40px 24px;
        }
        .lqr-confirmed-badge {
          width: 56px;
          height: 56px;
          background: #10b981;
          color: #000;
          border-radius: 50%;
          font-size: 28px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
        }
        .lqr-confirmed-title {
          font-size: 22px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 8px 0;
        }
        .lqr-confirmed-desc {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 20px 0;
        }
        .lqr-confirmed-box {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .lqr-alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
