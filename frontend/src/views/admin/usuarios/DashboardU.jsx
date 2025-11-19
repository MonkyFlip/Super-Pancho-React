import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaHome, FaSearch } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../../services/auth';
import Paginator from '../../../components/Paginator';
import { useTranslation } from 'react-i18next';

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;
const POLL_THEME_MS = 700;

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

/* Toolbar Actualizado */
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
        <FaHome style={{ fontSize: 18 }} />
        {t('users.dashboard.title')}
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
          placeholder={t('common.search') || "Buscar usuario..."}
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
        {t('users.dashboard.refreshButton')}
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
        <FaPlus /> {t('users.dashboard.addButton')}
      </button>
    </div>
  );
};

/* TableRow Actualizado */
const TableRow = ({ usuario, tema, onView, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <tr
      style={{
        borderBottom: `1px solid ${tema.borde}`,
        background: '#fff',
        transition: '100ms ease',
      }}
    >
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>{usuario.id}</td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>{usuario.usuario}</td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {usuario.usuario_key}
      </td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>{usuario.rol}</td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>
        {usuario.activo ? t('common.active') : t('common.inactive')}
      </td>
      <td style={{ padding: 10, fontSize: 13, color: tema.texto }}>{usuario.last_login ?? '-'}</td>
      <td style={{ padding: 10, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => onView(usuario)} title={t('users.table_tooltips.view')} style={baseIconBtn(tema)}>
            <FaEye />
          </button>
          <button onClick={() => onEdit(usuario)} title={t('users.table_tooltips.edit')} style={baseIconBtn(tema)}>
            <FaEdit />
          </button>
          <button onClick={() => onDelete(usuario)} title={t('users.table_tooltips.delete')} style={dangerIconBtn(tema)}>
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

const DashboardU = () => {
  const { t } = useTranslation();
  const [temaKey, setTemaKey] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; }
  });
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
  const [allowed, setAllowed] = useState(false);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (!e) return;
      if (e.key === THEME_KEY) setTemaKey(e.newValue || 'bosque_claro');
      if (e.key === 'app_auth_token' || e.key === 'app_auth_user') {
        if (!isAuthenticated()) window.location.hash = '#/login';
        else ensureLocalAdmin();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let last = temaKey;
    const interval = setInterval(() => {
      try {
        const now = localStorage.getItem(THEME_KEY) || 'bosque_claro';
        if (now !== last) { last = now; setTemaKey(now); }
      } catch {}
    }, POLL_THEME_MS);
    return () => clearInterval(interval);
  }, [temaKey]);

  const ensureLocalAdmin = useCallback(() => {
    try {
      if (!isAuthenticated()) { window.location.hash = '#/login'; return false; }
      const localUser = getStoredUser();
      if (!localUser) { window.location.hash = '#/login'; return false; }
      const rolLocal = localUser?.rol ?? localUser?.role ?? localUser?.roleName ?? localUser?.role_type ?? '';
      const isAdminLocal = String(rolLocal).toLowerCase().includes('admin');
      if (!isAdminLocal) {
        const home = getHomeRouteForUser(localUser) || '#/login';
        window.location.hash = home;
        return false;
      }
      setAllowed(true);
      return true;
    } catch (err) {
      if (mountedRef.current) window.location.hash = '#/login';
      return false;
    }
  }, []);

  const normalizeId = (d) => {
    if (!d) return null;
    if (d.id && (typeof d.id === 'string' || typeof d.id === 'number')) return String(d.id);
    const _id = d._id ?? d.id;
    if (!_id) return null;
    if (typeof _id === 'string') return _id;
    if (typeof _id === 'number') return String(_id);
    if (typeof _id === 'object') {
      if (_id.$oid) return String(_id.$oid);
      try { return JSON.stringify(_id); } catch {}
    }
    return String(_id);
  };

  const normalizeLastLogin = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val instanceof Date) return val.toISOString();
    return String(val);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setPage(1);
  };

  const fetchUsuarios = useCallback(async ({ page: reqPage = page, perPage: reqPerPage = perPage } = {}) => {
    if (!ensureLocalAdmin()) { setError(t('common.errors.invalidSession')); return; }
    setLoading(true);
    setError(null);

    try {
      const skip = (reqPage - 1) * reqPerPage;
      const res = await api.get('/usuarios', { 
        params: { 
          limit: reqPerPage, 
          skip,
          search: searchTerm
        } 
      });
      const payload = res?.data ?? null;

      let docs = [];
      let count = null;

      if (!payload) docs = [];
      else if (Array.isArray(payload)) docs = payload;
      else if (payload.data && payload.data.docs) {
         docs = payload.data.docs;
         count = payload.data.count;
      }
      else if (Array.isArray(payload.docs)) { 
         docs = payload.docs; 
         count = typeof payload.count === 'number' ? payload.count : docs.length; 
      }
      else {
        const firstArray = Object.values(payload || {}).find(v => Array.isArray(v));
        if (firstArray) docs = firstArray;
        else docs = typeof payload === 'object' ? [payload] : [];
      }

      const normalized = docs.map(d => ({
        id: normalizeId(d),
        usuario: d.usuario ?? d.name ?? d.username ?? '',
        usuario_key: d.usuario_key ?? (d.usuario ? String(d.usuario).toLowerCase() : '') ?? '',
        rol: d.rol ?? d.role ?? d.roleName ?? 'cliente',
        activo: typeof d.activo === 'boolean' ? d.activo : (d.activo === 'false' ? false : true),
        last_login: normalizeLastLogin(d.last_login ?? d.lastLogin ?? d.ultimo_login ?? null)
      }));

      if (mountedRef.current) {
        setRows(normalized);
        setTotalCount(typeof count === 'number' ? count : normalized.length);
        setPage(reqPage);
        setPerPage(reqPerPage);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || t('users.errors.load');
      if (mountedRef.current) setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ensureLocalAdmin, page, perPage, t, searchTerm]);

  useEffect(() => {
    if (ensureLocalAdmin()) fetchUsuarios({ page, perPage });
  }, [fetchUsuarios]);

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    fetchUsuarios({ page: newPage, perPage });
  };

  const handleCreate = () => { setShowCreate(false); fetchUsuarios({ page, perPage }); };
  const handleEdit = () => { setShowEdit(false); fetchUsuarios({ page, perPage }); };
  const handleDelete = () => { setShowDelete(false); fetchUsuarios({ page, perPage }); };

  if (!allowed) return null;

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
          onRefresh={() => fetchUsuarios({ page, perPage })} 
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
            {totalCount > 0
              ? t('users.table.summary', { count: rows.length, total: totalCount })
              : t('users.table.summary_partial', { count: rows.length })
            }
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: `2px solid ${tema.borde}` }}>
                  {['id', 'user', 'key', 'role', 'status', 'lastLogin', 'actions'].map((h, i) => (
                    <th 
                      key={i} 
                      style={{ 
                        padding: 10, 
                        textAlign: i === 6 ? 'right' : 'left', 
                        fontSize: 13,
                        color: tema.texto
                      }}
                    >
                      {t(`users.table.header.${h}`)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 14, color: '#666' }}>
                      {t('common.loading')}
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 14, color: '#666' }}>
                      {searchTerm ? t('users.table.body.noResults') : t('users.table.body.noData')}
                    </td>
                  </tr>
                )}

                {rows.map(u => (
                  <TableRow
                    key={u.id ?? JSON.stringify(u)}
                    usuario={u}
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
          <Paginator page={page} perPage={perPage} total={totalCount || 0} onPageChange={handlePageChange} />
        </div>

        {/* Modales */}
        <ModalCreate visible={showCreate} onClose={() => setShowCreate(false)} onSaveSuccess={handleCreate} tema={tema} />
        <ModalEdit visible={showEdit} onClose={() => setShowEdit(false)} onSaveSuccess={handleEdit} usuario={active} tema={tema} />
        <ModalDetail visible={showDetail} onClose={() => setShowDetail(false)} usuario={active} tema={tema} />
        <ModalDelete visible={showDelete} onClose={() => setShowDelete(false)} onConfirmSuccess={handleDelete} usuario={active} tema={tema} />
      </div>
    </div>
  );
};

export default DashboardU;