import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaThLarge } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import Paginator from '../../../components/Paginator';
import { useTranslation } from 'react-i18next'; // IMPORTAR

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;

// (Estilos no cambian)
const iconBtnStyle = (tema) => ({
  width: 34, height: 34, borderRadius: 8, border: 'none',
  background: 'transparent', display: 'grid', placeItems: 'center',
  cursor: 'pointer', color: tema.texto,
  transition: 'transform 120ms ease, box-shadow 120ms ease',
});
const iconBtnDangerStyle = (tema) => ({
  ...iconBtnStyle(tema),
  color: '#fff',
  background: tema.acento,
  boxShadow: `0 6px 14px ${tema.acento}22`,
});

// barra superior
const Toolbar = ({ tema, onNuevo, onRefresh, loading }) => {
  const { t } = useTranslation(); // Usar hook
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: tema.texto, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FaThLarge /> <span>{t('areas.dashboard.title')}</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRefresh}
          title={t('areas.dashboard.refreshTooltip')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8, border: `1px solid ${tema.borde}`,
            background: '#fff', color: tema.texto, cursor: 'pointer', fontSize: 13,
          }}
        >
          <FaSync style={{ transform: loading ? 'rotate(20deg)' : 'none', transition: 'transform 300ms linear' }} />
          {t('areas.dashboard.refreshButton')}
        </button>

        <button
          onClick={onNuevo}
          title={t('areas.dashboard.addTooltip')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8, border: 'none',
            background: tema.primario, color: '#fff', cursor: 'pointer',
            boxShadow: `0 8px 18px ${tema.acento}22`, fontWeight: 800, fontSize: 13,
          }}
        >
          <FaPlus /> {t('areas.dashboard.addButton')}
        </button>
      </div>
    </div>
  );
};

// fila de tabla
const TableRow = ({ area, tema, onView, onEdit, onDelete }) => {
  const { t } = useTranslation(); // Usar hook
  return (
    <tr style={{ borderBottom: `1px solid ${tema.borde}` }}>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{area._id}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{area.nombre}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <button onClick={() => onView(area)} title={t('areas.table_tooltips.view')} style={iconBtnStyle(tema)}>
            <FaEye />
          </button>
          <button onClick={() => onEdit(area)} title={t('areas.table_tooltips.edit')} style={iconBtnStyle(tema)}>
            <FaEdit />
          </button>
          <button onClick={() => onDelete(area)} title={t('areas.table_tooltips.delete')} style={iconBtnDangerStyle(tema)}>
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

const DashboardAreas = () => {
  const { t } = useTranslation(); // INSTANCIAR
  const [temaKey] = useState(() => localStorage.getItem(THEME_KEY) || 'bosque_claro');
  const tema = temas[temaKey] || temas.bosque_claro;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

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

  // cargar áreas desde API
  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/areas?page=${page}&limit=${perPage}`);
      const data = res.data;
      if (mountedRef.current) {
        setRows(data.data || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      setError(err?.response?.data?.error || t('areas.errors.load')); // Traducido
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, perPage, t]); // Añadir t

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
    <div style={{
      padding: 12, boxSizing: 'border-box',
      background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
      height: '100vh', overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 800, margin: '8px auto',
        display: 'flex', flexDirection: 'column',
        gap: 8, height: '100%',
      }}>
        <Toolbar tema={tema} onNuevo={() => setShowCreate(true)} onRefresh={fetchAreas} loading={loading} />

        <div style={{
          background: '#fff', borderRadius: 8, padding: 8,
          boxShadow: '0 8px 18px rgba(16,24,40,0.04)',
          border: `1px solid ${tema.borde}`,
          flex: '1 1 auto', display: 'flex',
          flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: '#666' }}>
              {/* Resumen traducido */}
              {t('areas.table.summary', { count: rows.length, total: totalCount })}
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: '1 1 auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: tema.texto }}>
                  {/* Encabezados traducidos */}
                  <th style={{ padding: '6px 8px' }}>{t('common.id')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('common.name')}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: 14, textAlign: 'center', color: '#666' }}>
                      {t('common.loading')}
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: 14, textAlign: 'center', color: '#666' }}>
                      {t('areas.table.body.noData')}
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

          {error && <div style={{ marginTop: 8, color: '#a33' }}>{error}</div>}
        </div>

        <div style={{ marginTop: 8 }}>
          <Paginator page={page} perPage={perPage} total={totalCount} onPageChange={handlePageChange} />
        </div>

        <ModalCreate visible={showCreate} onClose={() => setShowCreate(false)} onSaveSuccess={handleCreate} tema={tema} />
        <ModalEdit visible={showEdit} onClose={() => setShowEdit(false)} onSaveSuccess={handleEdit} area={active} tema={tema} />
        <ModalDetail visible={showDetail} onClose={() => setShowDetail(false)} area={active} tema={tema} />
        {/* 💡 CORRECCIÓN: 
          El dashboard pasa 'onDeleteSuccess', pero el modal 'ModalDeleteArea' espera 'onConfirmSuccess'.
          He corregido el prop name aquí para que coincida con el modal.
        */}
        <ModalDelete visible={showDelete} onClose={() => setShowDelete(false)} onConfirmSuccess={handleDelete} area={active} tema={tema} />
      </div>
    </div>
  );
};

export default DashboardAreas;