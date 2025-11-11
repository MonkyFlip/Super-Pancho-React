import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';   // ✅ IMPORT
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaBox } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import Paginator from '../../../components/Paginator';

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;

// estilos
const iconBtnStyle = (tema) => ({
  width: 34,
  height: 34,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  color: tema.texto,
  transition: 'transform 120ms ease, box-shadow 120ms ease',
});
const iconBtnDangerStyle = (tema) => ({
  ...iconBtnStyle(tema),
  color: '#fff',
  background: tema.acento,
  boxShadow: `0 6px 14px ${tema.acento}22`,
});

/* ✅ Toolbar con traducciones */
const Toolbar = ({ tema, onNuevo, onRefresh, loading }) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: tema.texto, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FaBox />
        <span>{t('products.title')}</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRefresh}
          title={t('products.toolbar.refreshTooltip')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 8,
            border: `1px solid ${tema.borde}`,
            background: '#fff',
            color: tema.texto,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <FaSync
            style={{
              transform: loading ? 'rotate(20deg)' : 'none',
              transition: 'transform 300ms linear',
            }}
          />
          {t('products.toolbar.refreshButton')}
        </button>

        <button
          onClick={onNuevo}
          title={t('products.toolbar.addTooltip')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 8,
            border: 'none',
            background: tema.primario,
            color: '#fff',
            cursor: 'pointer',
            boxShadow: `0 8px 18px ${tema.acento}22`,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <FaPlus /> {t('products.toolbar.addButton')}
        </button>
      </div>
    </div>
  );
};

/* ✅ FILA */
const TableRow = ({ producto, tema, onView, onEdit, onDelete }) => {
  const { t } = useTranslation();

  return (
    <tr style={{ borderBottom: `1px solid ${tema.borde}` }}>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>
        {typeof producto._id === 'object' ? producto._id.$oid : producto._id}
      </td>

      <td style={{ padding: '6px 8px', fontSize: 13 }}>{producto.nombre}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{producto.precio}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{producto.stock}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{producto.sku}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>{producto.area_id}</td>
      <td style={{ padding: '6px 8px', fontSize: 13 }}>
        {producto.activo ? t('products.table.status.active') : t('products.table.status.inactive')}
      </td>

      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <button
            onClick={() => onView(producto)}
            title={t('products.table.actions.viewTooltip')}
            style={iconBtnStyle(tema)}
          >
            <FaEye />
          </button>

          <button
            onClick={() => onEdit(producto)}
            title={t('products.table.actions.editTooltip')}
            style={iconBtnStyle(tema)}
          >
            <FaEdit />
          </button>

          <button
            onClick={() => onDelete(producto)}
            title={t('products.table.actions.deleteTooltip')}
            style={iconBtnDangerStyle(tema)}
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

/* ✅ COMPONENTE PRINCIPAL */
const DashboardP = () => {
  const { t } = useTranslation();

  const [temaKey] = useState(() => localStorage.getItem('app_theme_selected') || 'bosque_claro');
  const tema = temas[temaKey] || temas.bosque_claro;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(1);
  const [perPage] = useState(DEFAULT_PER_PAGE);

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

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/productos?page=${page}&limit=${perPage}`);
      const data = res.data;

      if (mountedRef.current) {
        setRows(data.data || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      setError(t('products.errors.load'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, perPage, t]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return (
    <div
      style={{
        padding: 12,
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '8px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          height: '100%',
        }}
      >
        <Toolbar
          tema={tema}
          onNuevo={() => setShowCreate(true)}
          onRefresh={fetchProductos}
          loading={loading}
        />

        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: 8,
            boxShadow: '0 8px 18px rgba(16,24,40,0.04)',
            border: `1px solid ${tema.borde}`,
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: '#666' }}>
              {t('products.summary', { count: rows.length, total: totalCount })}
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: '1 1 auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: tema.texto }}>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.id')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.name')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.price')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.stock')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.sku')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.area')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('products.table.header.status')}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {t('products.table.header.actions')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: 14, textAlign: 'center', color: '#666' }}>
                      {t('products.table.body.loading')}
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: 14, textAlign: 'center', color: '#666' }}>
                      {t('products.table.body.noData')}
                    </td>
                  </tr>
                )}

                {rows.map((p) => (
                  <TableRow
                    key={typeof p._id === 'object' ? p._id.$oid : p._id}
                    producto={p}
                    tema={tema}
                    onView={(x) => {
                      setActive(x);
                      setShowDetail(true);
                    }}
                    onEdit={(x) => {
                      setActive(x);
                      setShowEdit(true);
                    }}
                    onDelete={(x) => {
                      setActive(x);
                      setShowDelete(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {error && <div style={{ marginTop: 8, color: '#a33' }}>{error}</div>}
        </div>

        <div style={{ marginTop: 8 }}>
          <Paginator page={page} perPage={perPage} total={totalCount} onPageChange={setPage} />
        </div>

        <ModalCreate
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onSaveSuccess={fetchProductos}
          tema={tema}
        />
        <ModalEdit
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          onSaveSuccess={fetchProductos}
          producto={active}
          tema={tema}
        />
        <ModalDetail visible={showDetail} onClose={() => setShowDetail(false)} producto={active} tema={tema} />
        <ModalDelete
          visible={showDelete}
          onClose={() => setShowDelete(false)}
          onDeleteSuccess={fetchProductos}
          producto={active}
          tema={tema}
        />
      </div>
    </div>
  );
};

export default DashboardP;
