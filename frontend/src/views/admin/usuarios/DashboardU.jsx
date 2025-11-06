// src/views/usuarios/DashboardU.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaHome } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import api from '../../../services/api';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../../services/auth';
import Paginator from '../../../components/Paginator';

const THEME_KEY = 'app_theme_selected';
const DEFAULT_PER_PAGE = 12;
const POLL_THEME_MS = 700;

const iconBtnStyle = (tema) => ({
  width: 34, height: 34, borderRadius: 8, border: 'none',
  background: 'transparent', display: 'grid', placeItems: 'center',
  cursor: 'pointer', color: tema.texto,
  transition: 'transform 120ms ease, box-shadow 120ms ease'
});
const iconBtnDangerStyle = (tema) => ({
  ...iconBtnStyle(tema),
  color: '#fff',
  background: tema.acento,
  boxShadow: `0 6px 14px ${tema.acento}22`
});

const Toolbar = ({ tema, onNuevo, onRefresh, loading }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
    <div style={{ fontSize: 15, fontWeight: 800, color: tema.texto, display: 'flex', alignItems: 'center', gap: 8 }}>
      <FaHome /> <span>Gestionar Usuarios</span>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onRefresh}
        title="Actualizar lista"
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
          fontSize: 13
        }}
      >
        <FaSync style={{ transform: loading ? 'rotate(20deg)' : 'none', transition: 'transform 300ms linear' }} /> Actualizar
      </button>

      <button
        onClick={onNuevo}
        title="Agregar usuario"
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
          fontSize: 13
        }}
      >
        <FaPlus /> Nuevo
      </button>
    </div>
  </div>
);

const TableRow = ({ usuario, tema, onView, onEdit, onDelete }) => (
  <tr style={{ borderBottom: `1px solid ${tema.borde}` }}>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto, whiteSpace: 'nowrap', maxWidth: 160 }}>{usuario.id}</td>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto }}>{usuario.usuario}</td>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.usuario_key}</td>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto, whiteSpace: 'nowrap' }}>{usuario.rol}</td>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto, whiteSpace: 'nowrap' }}>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
    <td style={{ padding: '6px 8px', fontSize: 13, color: tema.texto, whiteSpace: 'nowrap' }}>{usuario.last_login ?? '-'}</td>
    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
      <div style={{ display: 'inline-flex', gap: 6 }}>
        <button onClick={() => onView(usuario)} title="Ver detalle" style={iconBtnStyle(tema)}><FaEye /></button>
        <button onClick={() => onEdit(usuario)} title="Editar" style={iconBtnStyle(tema)}><FaEdit /></button>
        <button onClick={() => onDelete(usuario)} title="Eliminar" style={iconBtnDangerStyle(tema)}><FaTrash /></button>
      </div>
    </td>
  </tr>
);

const DashboardU = () => {
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
        if (now !== last) {
          last = now;
          setTemaKey(now);
        }
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

  useEffect(() => {
    const onAuthStorage = (e) => {
      if (!e) return;
      if (e.key === 'app_auth_token' || e.key === 'app_auth_user' || e.key === null) {
        if (!isAuthenticated()) window.location.hash = '#/login';
        else ensureLocalAdmin();
      }
    };
    window.addEventListener('storage', onAuthStorage);
    return () => window.removeEventListener('storage', onAuthStorage);
  }, [ensureLocalAdmin]);

  const normalizeId = (d) => {
    if (!d) return null;
    if (d.id && (typeof d.id === 'string' || typeof d.id === 'number')) return String(d.id);
    const _id = d._id ?? d.id;
    if (!_id) return null;
    if (typeof _id === 'string') return _id;
    if (typeof _id === 'number') return String(_id);
    if (typeof _id === 'object') {
      if (_id.$oid) return String(_id.$oid);
      try { if (typeof _id.toString === 'function') { const s = _id.toString(); if (s && !s.includes('[object')) return s; } } catch {}
      try { return JSON.stringify(_id); } catch {}
    }
    return String(_id);
  };

  const normalizeLastLogin = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'object') {
      if (val.$date) return String(val.$date);
      try { return JSON.stringify(val); } catch {}
    }
    return String(val);
  };

  const fetchUsuarios = useCallback(async ({ page: reqPage = page, perPage: reqPerPage = perPage } = {}) => {
    if (!ensureLocalAdmin()) { setError('Sesión no válida'); return; }
    setLoading(true);
    setError(null);

    try {
      const skip = (reqPage - 1) * reqPerPage;
      const res = await api.get('/usuarios', { params: { limit: reqPerPage, skip } });
      const payload = res?.data ?? null;

      let docs = [];
      let count = null;

      if (!payload) docs = [];
      else if (Array.isArray(payload)) docs = payload;
      else if (Array.isArray(payload.docs)) { docs = payload.docs; count = typeof payload.count === 'number' ? payload.count : docs.length; }
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
      const msg = err?.response?.data?.error || err.message || 'Error al cargar usuarios';
      if (mountedRef.current) setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ensureLocalAdmin, page, perPage]);

  useEffect(() => {
    if (ensureLocalAdmin()) fetchUsuarios({ page, perPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    fetchUsuarios({ page: newPage, perPage });
  };

  const handleCreate = () => { setShowCreate(false); fetchUsuarios({ page, perPage }); };
  const handleEdit = () => { setShowEdit(false); fetchUsuarios({ page, perPage }); };
  const handleDelete = () => { setShowDelete(false); fetchUsuarios({ page, perPage }); };

  if (!allowed) return null;

  return (
    <div style={{
      padding: 12,
      boxSizing: 'border-box',
      background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})`,
      height: '100vh',
      overflow: 'hidden' // evita que la página general se estire
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '8px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%'
      }}>
        <Toolbar tema={tema} onNuevo={() => setShowCreate(true)} onRefresh={() => fetchUsuarios({ page, perPage })} loading={loading} />

        <div style={{
          background: '#fff',
          borderRadius: 8,
          padding: 8,
          boxShadow: '0 8px 18px rgba(16,24,40,0.04)',
          border: `1px solid ${tema.borde}`,
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0 // importante para que el hijo con overflow funcione en flex
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: '#666' }}>Mostrando {rows.length} registros {totalCount !== null ? `de ${totalCount}` : ''}</div>
          </div>

          <div style={{ overflow: 'auto', flex: '1 1 auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: tema.texto }}>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>ID</th>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>Usuario</th>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>Key</th>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>Rol</th>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>Estado</th>
                  <th style={{ padding: '6px 8px', fontSize: 12 }}>Último login</th>
                  <th style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading && rows.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: 14, textAlign: 'center', color: '#666' }}>Cargando...</td></tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: 14, textAlign: 'center', color: '#666' }}>No hay usuarios</td></tr>
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

          {error && <div style={{ marginTop: 8, color: '#a33' }}>{error}</div>}
        </div>

        <div style={{ marginTop: 8 }}>
          <Paginator page={page} perPage={perPage} total={totalCount || 0} onPageChange={handlePageChange} />
        </div>

        <ModalCreate
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onSaveSuccess={handleCreate}
          tema={tema}
        />

        <ModalEdit
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          onSaveSuccess={handleEdit}
          usuario={active}
          tema={tema}
        />

        <ModalDetail
          visible={showDetail}
          onClose={() => setShowDetail(false)}
          usuario={active}
          tema={tema}
        />

        <ModalDelete
          visible={showDelete}
          onClose={() => setShowDelete(false)}
          onDeleteSuccess={handleDelete}
          usuario={active}
          tema={tema}
        />
      </div>
    </div>
  );
};

export default DashboardU;
