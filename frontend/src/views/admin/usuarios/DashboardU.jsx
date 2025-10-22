// src/views/usuarios/DashboardU.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { temas } from '../../../styles/temas';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSync, FaHome } from 'react-icons/fa';
import ModalCreate from './ModalCreate';
import ModalEdit from './ModalEdit';
import ModalDetail from './ModalDetail';
import ModalDelete from './ModalDelete';
import { getUsuarios } from '../../../services/api';
import { isAuthenticated, getStoredUser, getHomeRouteForUser } from '../../../services/auth';

const THEME_KEY = 'app_theme_selected';

const iconBtnStyle = (tema) => ({
  width: 40, height: 40, borderRadius: 8, border: 'none',
  background: 'transparent', display: 'grid', placeItems: 'center',
  cursor: 'pointer', color: tema.texto,
  transition: 'transform 120ms ease, box-shadow 120ms ease'
});
const iconBtnDangerStyle = (tema) => ({
  ...iconBtnStyle(tema),
  color: '#fff',
  background: tema.acento,
  boxShadow: `0 8px 18px ${tema.acento}33`
});

const Toolbar = ({ tema, onNuevo, onRefresh, loading }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: tema.texto, display: 'flex', alignItems: 'center', gap: 12 }}>
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
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid rgba(16,24,40,0.06)',
          background: '#fff',
          color: tema.texto,
          cursor: 'pointer'
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
          padding: '8px 12px',
          borderRadius: 10,
          border: 'none',
          background: tema.primario,
          color: '#fff',
          cursor: 'pointer',
          boxShadow: `0 10px 22px ${tema.acento}33`,
          fontWeight: 800,
          transition: 'transform 140ms ease, box-shadow 140ms ease'
        }}
      >
        <FaPlus /> Nuevo
      </button>
    </div>
  </div>
);

const TableRow = ({ user, tema, onView, onEdit, onDelete }) => (
  <tr style={{ borderBottom: `1px solid ${tema.borde}` }}>
    <td style={{ padding: 12 }}>{user.id}</td>
    <td style={{ padding: 12 }}>{user.nombre}</td>
    <td style={{ padding: 12 }}>{user.email}</td>
    <td style={{ padding: 12 }}>{user.rol}</td>
    <td style={{ padding: 12 }}>{user.activo ? 'Activo' : 'Inactivo'}</td>
    <td style={{ padding: 12, textAlign: 'right' }}>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        <button onClick={() => onView(user)} title="Ver detalle" style={iconBtnStyle(tema)}><FaEye /></button>
        <button onClick={() => onEdit(user)} title="Editar" style={iconBtnStyle(tema)}><FaEdit /></button>
        <button onClick={() => onDelete(user)} title="Eliminar" style={iconBtnDangerStyle(tema)}><FaTrash /></button>
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

  // modales
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [active, setActive] = useState(null);

  const mountedRef = useRef(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === THEME_KEY) setTemaKey(e.newValue || 'bosque_claro'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Valida sesión y rol localmente; devuelve true si puede proceder
  const ensureLocalAdmin = useCallback(() => {
    try {
      if (!isAuthenticated()) {
        window.location.hash = '#/login';
        return false;
      }

      const localUser = getStoredUser();
      if (!localUser) {
        window.location.hash = '#/login';
        return false;
      }

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

  // Escucha cambios de auth en storage para invalidar sesión si es necesario
  useEffect(() => {
    const onAuthStorage = (e) => {
      if (!e) return;
      if (e.key === 'app_auth_token' || e.key === 'app_auth_user' || e.key === null) {
        // re-validate session
        if (!isAuthenticated()) {
          window.location.hash = '#/login';
        } else {
          ensureLocalAdmin();
        }
      }
    };
    window.addEventListener('storage', onAuthStorage);
    return () => window.removeEventListener('storage', onAuthStorage);
  }, [ensureLocalAdmin]);

  const fetchUsuarios = async () => {
    // Solo intentar si sesión/rol validados
    if (!ensureLocalAdmin()) {
      setError('Sesión no válida');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getUsuarios();
      const data = res?.data ?? [];
      setRows(Array.isArray(data) ? data : (data.rows || []));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al cargar usuarios');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Al montar validamos sesión y luego cargamos
    if (ensureLocalAdmin()) {
      fetchUsuarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // queremos correr solo al montar

  const handleCreate = (payload) => {
    setLoading(true);
    fetchUsuarios();
  };

  const handleEdit = (id, payload) => {
    setLoading(true);
    fetchUsuarios();
  };

  const handleDelete = (id) => {
    setLoading(true);
    fetchUsuarios();
  };

  return (
    <div style={{ padding: 20, minHeight: '100vh', background: `linear-gradient(180deg, ${tema.fondo}, ${tema.secundario})` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Toolbar tema={tema} onNuevo={() => setShowCreate(true)} onRefresh={fetchUsuarios} loading={loading} />

        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 12px 34px rgba(16,24,40,0.04)', border: `1px solid ${tema.borde}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: tema.texto }}>
                <th style={{ padding: 12, fontSize: 13 }}>ID</th>
                <th style={{ padding: 12, fontSize: 13 }}>Nombre</th>
                <th style={{ padding: 12, fontSize: 13 }}>Email</th>
                <th style={{ padding: 12, fontSize: 13 }}>Rol</th>
                <th style={{ padding: 12, fontSize: 13 }}>Estado</th>
                <th style={{ padding: 12, fontSize: 13, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#666' }}>Cargando...</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#666' }}>No hay usuarios</td></tr>
              )}

              {rows.map(u => (
                <TableRow
                  key={u.id ?? u._id}
                  user={{ id: u.id ?? u._id, nombre: u.nombre ?? u.name, email: u.email, rol: u.rol ?? u.role, activo: typeof u.activo === 'boolean' ? u.activo : true, telefono: u.telefono }}
                  tema={tema}
                  onView={(x) => { setActive(x); setShowDetail(true); }}
                  onEdit={(x) => { setActive(x); setShowEdit(true); }}
                  onDelete={(x) => { setActive(x); setShowDelete(true); }}
                />
              ))}
            </tbody>
          </table>

          {error && <div style={{ marginTop: 12, color: '#a33' }}>{error}</div>}
        </div>

        <ModalCreate
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onSaveSuccess={() => { setShowCreate(false); fetchUsuarios(); }}
          tema={tema}
        />

        <ModalEdit
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          onSaveSuccess={() => { setShowEdit(false); fetchUsuarios(); }}
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
          onConfirmSuccess={() => { setShowDelete(false); fetchUsuarios(); }}
          usuario={active}
          tema={tema}
        />
      </div>
    </div>
  );
};

export default DashboardU;
