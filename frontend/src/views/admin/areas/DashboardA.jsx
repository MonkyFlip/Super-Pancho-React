import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaThLarge, FaSearch } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import Paginator from '../../../components/Paginator';
import { useTranslation } from 'react-i18next'; 

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;

/* Botón de acción general - Actualizado para coincidir */
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

/* Toolbar ACTUALIZADO */
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
        <FaThLarge style={{ fontSize: 18 }} />
        {t('areas.dashboard.title')}
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
          placeholder={t('common.search') || "Buscar área..."}
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            borderRadius: 10,
            border: `1px solid ${tema.borde}`,
            fontSize: 14,
            background: '#fdfdfd',
            outline: 'none',
            color: tema.texto,
            boxSizing: 'border-box'
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
          color: tema.texto,
        }}
      >
        <FaSync
          style={{
            animation: loading ? 'spin 0.8s linear infinite' : 'none',
            fontSize: 13,
          }}
        />
        {t('areas.dashboard.refreshButton')}
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
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <FaPlus /> {t('areas.dashboard.addButton')}
      </button>
    </div>
  );
};

/* Fila de tabla ACTUALIZADA */
const TableRow = ({ area, tema, onView, onEdit, onDelete }) => {
  const { t } = useTranslation(); 
  return (
    <tr
      style={{
        borderBottom: `1px solid ${tema.borde}`,
        background: '#fff',
        transition: '100ms ease',
      }}
    >
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>
        {typeof area._id === 'object' ? area._id.$oid : area._id}
      </td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>{area.nombre}</td>
      <td style={{ padding: 10, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => onView(area)} title={t('areas.table_tooltips.view')} style={baseIconBtn(tema)}>
            <FaEye />
          </button>
          <button onClick={() => onEdit(area)} title={t('areas.table_tooltips.edit')} style={baseIconBtn(tema)}>
            <FaEdit />
          </button>
          <button onClick={() => onDelete(area)} title={t('areas.table_tooltips.delete')} style={dangerIconBtn(tema)}>
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

const DashboardAreas = () => {
  const { t } = useTranslation(); 
  const [temaKey] = useState(() => localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const tema = temas[temaKey] || temas.bosque_claro;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [active, setActive] = useState(null);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setPage(1);
  };

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/areas?page=${page}&limit=${perPage}&search=${encodeURIComponent(searchTerm)}`);
      const data = res.data;
      if (mountedRef.current) {
        setRows(data.data || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      setError(err?.response?.data?.error || t('areas.errors.load')); 
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, perPage, t, searchTerm]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setPage(newPage);
  };

  const handleCreate = () => { setShowCreate(false); fetchAreas(); };
  const handleEdit = () => { setShowEdit(false); fetchAreas(); };
  const handleDelete = () => { setShowDelete(false); fetchAreas(); };

  return (
    <div
      style={{
        padding: 14,
        height: '100vh',
        boxSizing: 'border-box',
        background: `linear-gradient(135deg, ${tema.fondo}, ${tema.secundario})`,
      }}
    >
      <div style={{ maxWidth: 800, margin: 'auto', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        
        <Toolbar 
          tema={tema} 
          onNuevo={() => setShowCreate(true)} 
          onRefresh={fetchAreas} 
          loading={loading} 
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />

        {/* Contenedor tabla - Actualizado */}
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
            {t('areas.table.summary', { count: rows.length, total: totalCount })}
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: `2px solid ${tema.borde}` }}>
                  {['id', 'name', 'actions'].map((h, i) => (
                    <th 
                      key={i} 
                      style={{ 
                        padding: 10, 
                        textAlign: i === 2 ? 'right' : 'left', 
                        fontSize: 13,
                        color: tema.texto
                      }}
                    >
                      {t(`areas.table.header.${h}`)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: 14, color: '#666' }}>
                      {t('common.loading')}
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: 14, color: '#666' }}>
                      {searchTerm ? t('areas.table.body.noResults') : t('areas.table.body.noData')}
                    </td>
                  </tr>
                )}

                {rows.map((a) => (
                  <TableRow
                    key={a._id}
                    area={a}
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

        <div style={{ marginTop: 'auto' }}>
          <Paginator page={page} perPage={perPage} total={totalCount} onPageChange={handlePageChange} />
        </div>

        <ModalCreate visible={showCreate} onClose={() => setShowCreate(false)} onSaveSuccess={handleCreate} tema={tema} />
        <ModalEdit visible={showEdit} onClose={() => setShowEdit(false)} onSaveSuccess={handleEdit} area={active} tema={tema} />
        <ModalDetail visible={showDetail} onClose={() => setShowDetail(false)} area={active} tema={tema} />
        <ModalDelete visible={showDelete} onClose={() => setShowDelete(false)} onConfirmSuccess={handleDelete} area={active} tema={tema} />
      </div>
    </div>
  );
};

export default DashboardAreas;