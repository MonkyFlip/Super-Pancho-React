
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaBox, FaSearch } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import Paginator from '../../../components/Paginator';

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;

/* Botón de acción general */
const baseIconBtn = (tema) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: 'none',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: '150ms ease',
  fontSize: 14,
  color: tema.texto,
  background: '#f8f9fa',
  boxShadow: `0 2px 4px ${tema.acento}22`,
});
const dangerIconBtn = (tema) => ({
  ...baseIconBtn(tema),
  background: tema.acento,
  color: '#fff',
  boxShadow: `0 5px 14px ${tema.acento}44`,
});

/* Toolbar */
const Toolbar = ({ tema, onNuevo, onRefresh, loading, searchTerm, onSearchChange }) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: 12,
        background: '#fff',
        borderRadius: 12,
        border: `1px solid ${tema.borde}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16 }}>
        <FaBox style={{ fontSize: 18 }} />
        {t('products.title')}
      </div>

      {/* Búsqueda */}
      <div style={{ flex: 1, position: 'relative' }}>
        <FaSearch
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999',
            fontSize: 14,
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('products.toolbar.searchPlaceholder')}
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            borderRadius: 10,
            border: `1px solid ${tema.borde}`,
            fontSize: 14,
            background: '#fdfdfd',
            outline: 'none',
          }}
        />
      </div>

      {/* Botón refrescar */}
      <button
        onClick={onRefresh}
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          background: '#f1f1f1',
          border: `1px solid ${tema.borde}`,
        }}
      >
        <FaSync
          style={{
            animation: loading ? 'spin 0.8s linear infinite' : 'none',
            fontSize: 13,
          }}
        />
        {t('products.toolbar.refreshButton')}
      </button>

      {/* Nuevo */}
      <button
        onClick={onNuevo}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: 'none',
          background: tema.primario,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          boxShadow: `0 6px 16px ${tema.primario}33`,
        }}
      >
        <FaPlus /> {t('products.toolbar.addButton')}
      </button>
    </div>
  );
};

/* Fila tabla */
const TableRow = ({ producto, tema, onView, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <tr
      style={{
        borderBottom: `1px solid ${tema.borde}`,
        background: '#fff',
        transition: '100ms ease',
      }}
    >
      <td style={{ padding: 10, fontSize: 13 }}>
        {typeof producto._id === 'object' ? producto._id.$oid : producto._id}
      </td>
      <td style={{ padding: 10, fontSize: 13 }}>{producto.nombre}</td>
      <td style={{ padding: 10, fontSize: 13 }}>{producto.precio}</td>
      <td style={{ padding: 10, fontSize: 13 }}>{producto.stock}</td>
      <td style={{ padding: 10, fontSize: 13 }}>{producto.sku}</td>
      <td style={{ padding: 10, fontSize: 13 }}>{producto.area_id}</td>
      <td style={{ padding: 10, fontSize: 13 }}>
        {producto.activo
          ? t('products.table.status.active')
          : t('products.table.status.inactive')}
      </td>
      <td style={{ padding: 10, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => onView(producto)} style={baseIconBtn(tema)}>
            <FaEye />
          </button>
          <button onClick={() => onEdit(producto)} style={baseIconBtn(tema)}>
            <FaEdit />
          </button>
          <button onClick={() => onDelete(producto)} style={dangerIconBtn(tema)}>
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

/* Principal */
const DashboardP = () => {
  const { t } = useTranslation();

  const [temaKey] = useState(localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const tema = temas[temaKey];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(DEFAULT_PER_PAGE);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [active, setActive] = useState(null);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const handleSearchChange = (v) => {
    setSearchTerm(v);
    setPage(1);
  };

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/productos?page=${page}&limit=${perPage}&search=${encodeURIComponent(searchTerm)}`
      );
      if (mountedRef.current) {
        setRows(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch {
      setError(t('products.errors.load'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, perPage, searchTerm, t]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return (
    <div
      style={{
        padding: 14,
        height: '100vh',
        boxSizing: 'border-box',
        background: `linear-gradient(135deg, ${tema.fondo}, ${tema.secundario})`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: 'auto', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        
        <Toolbar
          tema={tema}
          onNuevo={() => setShowCreate(true)}
          onRefresh={fetchProductos}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />

        {/* Contenedor tabla */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: `1px solid ${tema.borde}`,
            padding: 10,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: 8, color: '#444', fontSize: 13 }}>
            {t('products.summary', { count: rows.length, total: totalCount })}
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: `2px solid ${tema.borde}` }}>
                  {[
                    'id',
                    'name',
                    'price',
                    'stock',
                    'sku',
                    'area',
                    'status',
                    'actions',
                  ].map((h, i) => (
                    <th key={i} style={{ padding: 10, textAlign: i === 7 ? 'right' : 'left', fontSize: 13 }}>
                      {t(`products.table.header.${h}`)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: 14 }}>Cargando...</td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: 14 }}>
                      {searchTerm ? 'No hay resultados' : 'No hay datos'}
                    </td>
                  </tr>
                )}

                {rows.map((p) => (
                  <TableRow
                    key={typeof p._id === 'object' ? p._id.$oid : p._id}
                    producto={p}
                    tema={tema}
                    onView={(x) => { setActive(x); setShowDetail(true); }}
                    onEdit={(x) => { setActive(x); setShowEdit(true); }}
                    onDelete={(x) => { setActive(x); setShowDelete(true); }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {error && <div style={{ color: '#a33', marginTop: 8 }}>{error}</div>}
        </div>

        <Paginator
          page={page}
          perPage={perPage}
          total={totalCount}
          onPageChange={setPage}
        />

        {/* Modales */}
        <ModalCreate visible={showCreate} onClose={() => setShowCreate(false)} onSaveSuccess={fetchProductos} tema={tema} />
        <ModalEdit visible={showEdit} onClose={() => setShowEdit(false)} onSaveSuccess={fetchProductos} producto={active} tema={tema} />
        <ModalDetail visible={showDetail} onClose={() => setShowDetail(false)} producto={active} tema={tema} />
        <ModalDelete visible={showDelete} onClose={() => setShowDelete(false)} onDeleteSuccess={fetchProductos} producto={active} tema={tema} />
      </div>
    </div>
  );
};

export default DashboardP;
