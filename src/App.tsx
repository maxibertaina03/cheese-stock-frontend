// App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL;

interface TipoQueso {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  plu: string;
  seVendePorUnidad: boolean;
  tipoQueso: TipoQueso;
}

interface Particion {
  id: number;
  peso: number;
  createdAt: string;
  observacionesCorte: string | null;
}

interface Unidad {
  id: number;
  producto: Producto;
  pesoInicial: number;
  pesoActual: number;
  activa: boolean;
  particiones: Particion[];
  createdAt: string;
  observacionesIngreso: string | null;
}

function App() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tiposQueso, setTiposQueso] = useState<TipoQueso[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [codigoBarras, setCodigoBarras] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [observacionesIngreso, setObservacionesIngreso] = useState('');
  const [observacionesCorte, setObservacionesCorte] = useState('');
  const [codigoBarrasCorte, setCodigoBarrasCorte] = useState('');

  // Agregar estos estados al inicio del componente
  const [filtroInventario, setFiltroInventario] = useState('');
  const [busquedaObservaciones, setBusquedaObservaciones] = useState(false);
 
  // Historial state
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialUnidades, setHistorialUnidades] = useState<Unidad[]>([]);
  const [filtroHistorial, setFiltroHistorial] = useState<'todos' | 'activos' | 'agotados'>('todos');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Modal state
  const [showCutModal, setShowCutModal] = useState(false);
  const [unidadParaCortar, setUnidadParaCortar] = useState<Unidad | null>(null);
  const [pesoCorte, setPesoCorte] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [unidadParaEditar, setUnidadParaEditar] = useState<Unidad | null>(null);

  // Agregar estos estados
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoQuesoFiltro, setTipoQuesoFiltro] = useState<string>('todos');
  const [precios, setPrecios] = useState<Record<number, number>>({}); // productoId -> precio
  
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchUnidades(),
      fetchProductos(),
      fetchTiposQueso()
    ]);
  };

  const fetchUnidades = async () => {
    try {
      const response = await fetch(`${API_URL}/unidades`);
      const data = await response.json();
      setUnidades(data);
    } catch (error) {
      console.error('Error al cargar unidades:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch(`${API_URL}/productos`);
      const data = await response.json();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchHistorial = async () => {
    try {
      const response = await fetch(`${API_URL}/unidades/historial`);
      const data = await response.json();
      setHistorialUnidades(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const fetchTiposQueso = async () => {
    try {
      const response = await fetch(`${API_URL}/tipos-queso`);
      const data = await response.json();
      setTiposQueso(data);
    } catch (error) {
      console.error('Error al cargar tipos de queso:', error);
    }
  };

  const decodificarBarcode = (barcode: string) => {
    if (barcode.length !== 13) {
      setError('El código debe tener exactamente 13 dígitos');
      return null;
    }

    const plu = barcode.substring(2, 7);
    const pesoStr = barcode.substring(7, 12);
    const pesoGramos = parseInt(pesoStr, 10);

    if (isNaN(pesoGramos) || pesoGramos <= 0) {
      setError('Peso inválido en código de barras');
      return null;
    }

    const producto = productos.find(p => p.plu === plu);
    if (!producto) {
      setError(`No se encontró producto con PLU: ${plu}`);
      return null;
    }

    return { producto, peso: pesoGramos };
  };
 
  // Agregar esta función para filtrar unidades
  const unidadesFiltradas = unidades.filter(unidad => {
    const searchLower = filtroInventario.toLowerCase();
    const matchNombre = unidad.producto.nombre.toLowerCase().includes(searchLower);
    const matchPLU = unidad.producto.plu.includes(searchLower);
    const matchID = unidad.id.toString().includes(searchLower);
    
    // Si está activada la búsqueda por observaciones
    if (busquedaObservaciones && unidad.observacionesIngreso) {
      const matchObservaciones = unidad.observacionesIngreso.toLowerCase().includes(searchLower);
      return matchObservaciones;
    }
    
    return matchNombre || matchPLU || matchID;
  });
  
  // Agregar función para contar unidades por producto
  const contarUnidadesPorProducto = (productoId: number) => {
    return unidades.filter(u => u.producto.id === productoId && u.activa).length;
  };

  // Agregar función para editar unidad
  const handleEditUnidad = async (unidadId: number, nuevasObservaciones: string) => {
    try {
      const response = await fetch(`${API_URL}/unidades/${unidadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacionesIngreso: nuevasObservaciones }),
      });

      if (response.ok) {
        setSuccess('Unidad actualizada correctamente');
        await fetchUnidades();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al actualizar unidad');
      }
    } catch (error) {
      setError('Error de conexión con el servidor');
    }
  };


    // Función para obtener el stock actual de un producto
  const getStockActualProducto = (productoId: number) => {
    return unidades.filter(u => u.producto.id === productoId && u.activa).length;
  };

  // Función para calcular cuántas unidades se agotaron de un producto
  const getUnidadesAgotadasProducto = (productoId: number) => {
    return historialUnidades.filter(u => u.producto.id === productoId && !u.activa).length;
  };

  // Función para calcular el peso total vendido por producto
  const getPesoVendidoProducto = (productoId: number) => {
    return historialUnidades
      .filter(u => u.producto.id === productoId && !u.activa)
      .reduce((sum, u) => sum + (Number(u.pesoInicial)), 0);
  };

  const handleBarcodeCorteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCodigoBarrasCorte(value);

    if (value.length === 13 && unidadParaCortar) {
      const resultado = decodificarBarcode(value);
      if (!resultado) {
        setError('Código de barras inválido');
        return;
      }

      const nuevoPeso = resultado.peso;
      const pesoActual = unidadParaCortar.pesoActual;

      if (nuevoPeso > pesoActual) {
        setError('El peso escaneado es mayor al disponible');
        setPesoCorte('');
        return;
      }

      const corte = pesoActual - nuevoPeso;
      setPesoCorte(corte.toString());
    }
  };


  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCodigoBarras(value);
    setError('');
    setProductoSeleccionado(null);

    if (value.length === 13) {
      const resultado = decodificarBarcode(value);
      if (resultado) {
        setProductoSeleccionado(resultado.producto);
      }
    }
  };

  const handleSubmit = async () => {
    if (!codigoBarras || codigoBarras.length !== 13) {
      setError('Ingrese un código de barras válido de 13 dígitos');
      return;
    }

    const resultado = decodificarBarcode(codigoBarras);
    if (!resultado) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: resultado.producto.id,
          pesoInicial: resultado.peso,
          observacionesIngreso: observacionesIngreso || null,
        }),
      });

      if (response.ok) {
        setSuccess('Unidad ingresada correctamente');
        setCodigoBarras('');
        setProductoSeleccionado(null);
        setObservacionesIngreso('');
        setShowForm(false);
        await fetchUnidades();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al ingresar unidad');
      }
    } catch (error) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCutModal = (unidad: Unidad) => {
    setUnidadParaCortar(unidad);
    setPesoCorte('');
    setObservacionesCorte('');
    setShowCutModal(true);
  };

  const handleCut = async () => {
    if (!unidadParaCortar) return;

    const peso = parseFloat(pesoCorte);
    if (isNaN(peso) || peso < 0) {
      setError('¿Confirmas el corte?');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/unidades/${unidadParaCortar.id}/particiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso,
          observacionesCorte: observacionesCorte || 'Corte sin observaciones',
        }),
      });

      if (response.ok) {
        setSuccess('Corte registrado');
        setShowCutModal(false);
        setCodigoBarrasCorte('');
        setPesoCorte('');
        setObservacionesCorte('');
        await fetchUnidades();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cortar');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoBadgeClass = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      'blando': 'badge-blando',
      'semi-duro': 'badge-semi-duro',
      'duro': 'badge-duro',
    };
    return tipos[tipo?.toLowerCase()] || 'badge-blando';
  };

  // Reemplazar la función de filtrado del historial
  const historialFiltrado = historialUnidades.filter(unidad => {
    // Filtro por estado (activos/agotados/todos)
    if (filtroHistorial === 'activos' && !unidad.activa) return false;
    if (filtroHistorial === 'agotados' && unidad.activa) return false;

    // Filtro por tipo de queso
    if (tipoQuesoFiltro !== 'todos' && unidad.producto.tipoQueso.nombre.toLowerCase() !== tipoQuesoFiltro) {
      return false;
    }

    // Filtro por fechas
    if (fechaInicio || fechaFin) {
      const unidadFecha = new Date(unidad.createdAt);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;

      if (inicio && unidadFecha < inicio) return false;
      if (fin && unidadFecha > fin) return false;
    }

    // Filtro por búsqueda de texto
    if (busquedaHistorial) {
      const searchLower = busquedaHistorial.toLowerCase();
      const matchNombre = unidad.producto.nombre.toLowerCase().includes(searchLower);
      const matchPLU = unidad.producto.plu.includes(searchLower);
      const matchID = unidad.id.toString().includes(searchLower);
      const matchObservaciones = unidad.observacionesIngreso?.toLowerCase().includes(searchLower);
      
      return matchNombre || matchPLU || matchID || matchObservaciones;
    }

    return true;
  });


  // Calcular estadísticas del historial con los nuevos filtros
  const statsHistorial = {
    total: historialFiltrado.length,
    activos: historialFiltrado.filter(u => u.activa).length,
    agotados: historialFiltrado.filter(u => !u.activa).length,
    pesoTotal: historialFiltrado.reduce((sum, u) => sum + Number(u.pesoInicial), 0),
    pesoVendido: historialFiltrado.reduce((sum, u) => sum + (Number(u.pesoInicial) - Number(u.pesoActual)), 0),
    productosDiferentes: new Set(historialFiltrado.map(u => u.producto.id)).size,
  };
  const statsAdicionales = React.useMemo(() => {
    const agotadas = historialFiltrado.filter(u => !u.activa);

    // productos más vendidos (cantidad de unidades agotadas)
    const productosMasVendidos = agotadas.reduce<Record<string, number>>((acc, u) => {
      const nombre = u.producto.nombre;
      acc[nombre] = (acc[nombre] || 0) + 1;
      return acc;
    }, {});

    // peso total vendido por tipo de queso
    const pesoPorTipo = agotadas.reduce<Record<string, number>>((acc, u) => {
      const tipo = u.producto.tipoQueso.nombre;
      acc[tipo] = (acc[tipo] || 0) + Number(u.pesoInicial);
      return acc;
    }, {});

    return { productosMasVendidos, pesoPorTipo };
  }, [historialFiltrado]);

  const handleOpenHistorial = async () => {
    setShowHistorial(true);
    await fetchHistorial();
  };

  // Modificar la función renderUnidadCard para el historial
  const renderUnidadCard = (unidad: Unidad, isHistorial = false) => (
    <div key={unidad.id} className="unit-card">
      <div className="unit-header">
        <div className="unit-info">
          <div className="unit-title-row">
            <span className={`badge ${getTipoBadgeClass(unidad.producto.tipoQueso.nombre)}`}>
              {unidad.producto.tipoQueso.nombre}
            </span>
            <span className="badge badge-plu">PLU: {unidad.producto.plu}</span>
            <span className={`badge ${unidad.activa ? 'badge-status' : 'badge-inactive'}`}>
              {unidad.activa ? 'Activa' : 'Agotada'}
            </span>
            
            {/* Mostrar stock actual solo en historial */}
            {isHistorial && (
              <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                Stock Actual: {getStockActualProducto(unidad.producto.id)}
              </span>
            )}
            
            {/* Mostrar contador solo en inventario actual */}
            {!isHistorial && unidad.activa && (
              <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                Stock: {contarUnidadesPorProducto(unidad.producto.id)}
              </span>
            )}
          </div>
          <h3 className="unit-name">{unidad.producto.nombre}</h3>
          <div className="unit-id">ID: #{unidad.id}</div>
          
          {/* Agregar información adicional en el historial */}
          {isHistorial && !unidad.activa && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Unidades agotadas: {getUnidadesAgotadasProducto(unidad.producto.id)} | 
              Peso vendido: {(getPesoVendidoProducto(unidad.producto.id) / 1000).toFixed(1)}kg
            </div>
          )}
        </div>

        {unidad.activa && !isHistorial && (
                  <div className="unit-actions">
                    {unidad.activa && !isHistorial && (
                      <>
                        <button
                          className="btn-action btn-cut"
                          onClick={() => handleOpenCutModal(unidad)}
                        >
                          ✂️ Cortar
                        </button>
                        <button
                          className="btn-action btn-edit"
                          onClick={() => {
                            setUnidadParaEditar(unidad);
                            setShowEditModal(true);
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </>
      )}
    </div>
        )}
      </div>

      <div className="unit-details">
        <div className="detail-item">
          <div className="detail-label">Peso Inicial</div>
          <div className="detail-value">{unidad.pesoInicial}g</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Peso Actual</div>
          <div className="detail-value highlight">{unidad.pesoActual}g</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Cortado</div>
          <div className="detail-value">{Number(unidad.pesoInicial) - Number(unidad.pesoActual)}g</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Ingresado</div>
          <div className="detail-value" style={{ fontSize: '0.875rem' }}>
            {formatDate(unidad.createdAt)}
          </div>
        </div>
      </div>

      {unidad.observacionesIngreso && (
        <div className="observaciones-section">
          <div className="observaciones-title">Observaciones de Ingreso</div>
          <div className="observaciones-content">{unidad.observacionesIngreso}</div>
        </div>
      )}

      {unidad.particiones && unidad.particiones.length > 0 && (
        <div className="partitions-section">
          <div className="partitions-header">
            <div className="partitions-title">Historial de Cortes</div>
            <div className="partitions-count">{unidad.particiones.length}</div>
          </div>
          <div className="partitions-list">
            {unidad.particiones.map((particion, idx) => (
              <div key={particion.id} className="partition-item">
                <div className="partition-number">Corte #{idx + 1}</div>
                <div className="partition-weight">{particion.peso}g</div>
                <div className="partition-date">{formatDate(particion.createdAt)}</div>
                {particion.observacionesCorte && (
                  <div className="partition-observaciones">{particion.observacionesCorte}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  // Agregar este componente antes del return principal
const EditModal = ({ unidad, onClose, onSave }: { 
  unidad: Unidad | null; 
  onClose: () => void; 
  onSave: (observaciones: string) => void;
}) => {
  const [observaciones, setObservaciones] = useState(unidad?.observacionesIngreso || '');

  if (!unidad) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Editar Unidad</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Producto</label>
          <input type="text" className="form-input" value={unidad.producto.nombre} disabled />
        </div>

        <div className="form-group">
          <label className="form-label">Observaciones de Ingreso</label>
          <textarea
            className="form-input"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
            placeholder="Ej: Lote #123, Vencimiento: 15/03, etc."
          />
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-confirm" onClick={() => onSave(observaciones)}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
            </div>
            <div className="header-title">
              <h1>Stock de Quesos</h1>
              <p>Las Tres Estrellas</p>
            </div>
          </div>

          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-value">{unidades.filter(u => u.activa).length}</div>
              <div className="stat-label">Activas</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">{productos.length}</div>
              <div className="stat-label">Productos</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={handleOpenHistorial}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v5h5M3 8a9 9 0 1 0 18 0A9 9 0 0 0 3 8z" />
              </svg>
              Historial
            </button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {showForm ? 'Cerrar' : 'Nuevo Ingreso'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <div className="alert-title">Valida</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">✓</div>
          <div className="alert-content">
            <div className="alert-title">Éxito</div>
            <div>{success}</div>
          </div>
        </div>
      )}
      {showEditModal && (
        <EditModal
          unidad={unidadParaEditar}
          onClose={() => {
            setShowEditModal(false);
            setUnidadParaEditar(null);
          }}
          onSave={(observaciones) => {
            if (unidadParaEditar) {
              handleEditUnidad(unidadParaEditar.id, observaciones);
              setShowEditModal(false);
              setUnidadParaEditar(null);
            }
          }}
        />
      )}
      {/* Historial Modal */}
      {showHistorial && (
        <div className="modal-overlay" onClick={() => setShowHistorial(false)}>
          <div className="modal historial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Historial Completo</h3>
              <button className="btn-close" onClick={() => setShowHistorial(false)}>
                ✕
              </button>
            </div>

            {/* Estadísticas del historial */}
            <div className="historial-stats">
              <div className="stat-card">
                <div className="stat-card-value">{statsHistorial.total}</div>
                <div className="stat-card-label">Total Unidades</div>
              </div>
              <div className="stat-card stat-card-success">
                <div className="stat-card-value">{statsHistorial.activos}</div>
                <div className="stat-card-label">Activas</div>
              </div>
              <div className="stat-card stat-card-inactive">
                <div className="stat-card-value">{statsHistorial.agotados}</div>
                <div className="stat-card-label">Agotadas</div>
              </div>
              <div className="stat-card stat-card-primary">
                <div className="stat-card-value">{(statsHistorial.pesoTotal / 1000).toFixed(1)}kg</div>
                <div className="stat-card-label">Peso Total</div>
              </div>
              <div className="stat-card stat-card-warning">
                <div className="stat-card-value">{(statsHistorial.pesoVendido / 1000).toFixed(1)}kg</div>
                <div className="stat-card-label">EGRESO TOTAL</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="historial-filters">
              {/* Filtro por fechas */}
              <div className="filter-group">
                <label className="form-label">Rango de Fechas</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span>hasta</span>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {(fechaInicio || fechaFin) && (
                    <button
                      className="btn-action"
                      onClick={() => {
                        setFechaInicio('');
                        setFechaFin('');
                      }}
                      style={{ background: '#ef4444', color: 'white', border: 'none' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro por tipo de queso */}
              <div className="filter-group">
                <label className="form-label">Tipo de Queso</label>
                <select
                  className="form-select"
                  value={tipoQuesoFiltro}
                  onChange={(e) => setTipoQuesoFiltro(e.target.value)}
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="blando">Blando</option>
                  <option value="semi-duro">Semi-duro</option>
                  <option value="duro">Duro</option>
                </select>
              </div>

              {/* Búsqueda por texto */}
              <div className="filter-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Buscar por nombre, PLU, ID o observaciones..."
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                />
              </div>

              {/* Botones de filtro rápido */}
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${filtroHistorial === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroHistorial('todos')}
                >
                  Todos ({statsHistorial.total})
                </button>
                <button 
                  className={`filter-btn ${filtroHistorial === 'activos' ? 'active' : ''}`}
                  onClick={() => setFiltroHistorial('activos')}
                >
                  Activos ({statsHistorial.activos})
                </button>
                <button 
                  className={`filter-btn ${filtroHistorial === 'agotados' ? 'active' : ''}`}
                  onClick={() => setFiltroHistorial('agotados')}
                >
                  Agotados ({statsHistorial.agotados})
                </button>
              </div>
            </div>

            {/* Lista del historial */}
            <div className="historial-content">
              {historialFiltrado.length === 0 ? (
                <div className="empty-state">
                  <h3>No se encontraron registros</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div className="inventory-grid">
                  {historialFiltrado.map(unidad => renderUnidadCard(unidad, true))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card form-section">
          <h2>Registrar Nueva Unidad</h2>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Código de Barras</label>
              <input
                type="text"
                className="form-input barcode-input"
                value={codigoBarras}
                onChange={handleBarcodeChange}
                placeholder="0000000000000"
                maxLength={13}
              />
              <div className="form-hint">
                Formato: 00 + PLU (5 dígitos) + Peso (5 dígitos) + 1 dígito
              </div>
            </div>

            {productoSeleccionado && (
              <>
                <div className="form-group">
                  <label className="form-label">Producto Detectado</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productoSeleccionado.nombre}
                    disabled
                  />
                  <div className="form-hint">
                    Peso: {decodificarBarcode(codigoBarras)?.peso || 0}g
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones de Ingreso (opcional)</label>
                  <textarea
                    className="form-input"
                    value={observacionesIngreso}
                    onChange={(e) => setObservacionesIngreso(e.target.value)}
                    placeholder="Ej: Lote #123, Vencimiento: 15/03, etc."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={loading || !productoSeleccionado}
          >
            {loading ? 'Procesando...' : 'Registrar Unidad'}
          </button>
        </div>
      )}

      {/* Inventory */}
          <div className="card">
            <h2>Inventario Actual</h2>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Buscar en inventario</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  className="form-input"
                  value={filtroInventario}
                  onChange={(e) => setFiltroInventario(e.target.value)}
                  placeholder="Buscar por nombre, PLU o ID..."
                  style={{ flex: 1 }}
                />
                <button
                  className={`filter-btn ${busquedaObservaciones ? 'active' : ''}`}
                  onClick={() => setBusquedaObservaciones(!busquedaObservaciones)}
                  style={{ marginBottom: 0 }}
                >
                  🔍 Observaciones
                </button>
              </div>
            </div>

            {unidadesFiltradas.length === 0 ? (
              <div className="empty-state">
                <h3>No se encontraron unidades</h3>
                <p>Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="inventory-grid">
                {unidadesFiltradas.map(unidad => renderUnidadCard(unidad))}
              </div>
            )}
          </div>

        {showCutModal && unidadParaCortar && (
          <div className="modal-overlay" onClick={() => setShowCutModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Realizar Corte</h3>
                <button className="btn-close" onClick={() => setShowCutModal(false)}>✕</button>
              </div>

              <div className="form-group">
                <label className="form-label">Producto</label>
                <input type="text" className="form-input" value={unidadParaCortar.producto.nombre} disabled />
              </div>

              <div className="form-group">
                <label className="form-label">Peso Disponible</label>
                <input type="text" className="form-input" value={`${unidadParaCortar.pesoActual}g`} disabled />
              </div>

              {/* Lector de código */}
              <div className="form-group">
                <label className="form-label">Escanear código de barras del queso después del corte</label>
                <input
                  type="text"
                  className="form-input barcode-input"
                  value={codigoBarrasCorte}
                  onChange={handleBarcodeCorteChange}
                  placeholder="0000000000000"
                  maxLength={13}
                />
                <div className="form-hint">
                  Escaneá el código del queso que quedó. Se calculará automáticamente cuánto se cortó.
                </div>
              </div>

              {/* Mostrar peso calculado */}
              {pesoCorte && (
                <div className="form-group">
                  <label className="form-label">Peso a cortar (calculado)</label>
                  <input type="text" className="form-input" value={`${pesoCorte}g`} disabled />
                </div>
              )}

              {unidadParaCortar.pesoActual > 0 && (
                <div className="form-group">
                  <button
                    className="btn-action btn-cut"
                      onClick={async () => {
                        const pesoFinal = unidadParaCortar.pesoActual;
                        setPesoCorte(pesoFinal.toString());
                        setObservacionesCorte('Corte final – queso agotado');
                        await handleCut();
                      }}
                  >
                    🧀 Egresar todo ({unidadParaCortar.pesoActual}g)
                  </button>
                </div>
              )}

              {/* Observaciones opcionales */}
              <div className="form-group">
                <label className="form-label">Observaciones del corte (opcional)</label>
                <textarea
                  className="form-input"
                  value={observacionesCorte}
                  onChange={(e) => setObservacionesCorte(e.target.value)}
                  placeholder="Ej: Cliente: Juan Pérez, Pedido especial, etc."
                  rows={3}
                />
              </div>

              {/* Acciones */}
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowCutModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleCut}
                  disabled={loading || !pesoCorte}
                >
                  {loading ? 'Procesando...' : 'Confirmar Corte'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
      
    
  );
}

export default App;