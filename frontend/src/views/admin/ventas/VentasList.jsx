// VentasList.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { getVentas, crearVenta, actualizarVenta, eliminarVenta } from '../../../services/api';
import { temas } from '../../../styles/temas';
import DataTable from '../../../components/admin/DataTable';
import FiltersPanel from '../../../components/admin/FiltersPanel';
import FormModal from '../../../components/admin/FormModal';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import VentaForm from './VentaForm';
import VentaDetail from './VentaDetail';

const THEME_KEY = 'app_theme_selected';
const PER_PAGE = 10;

const VentasList = () => {
  const themeKey = (() => { try { return localStorage.getItem(THEME_KEY) || 'bosque_claro'; } catch { return 'bosque_claro'; } })();
  const tema = temas[themeKey] || temas.bosque_claro;

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [error, setError] = useState('');

  // modals / dialogs
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const fetchPage = useCallback(async (opts = {}) => {
    const pg = opts.page ?? page;
    const q = opts.q ?? filters.q;
    const estadoPago = opts.estadoPago ?? filters.estadoPago;
    try {
      setLoading(true);
      setError('');
      const res = await getVentas({
        page: pg,
        perPage: PER_PAGE,
        q,
        sortBy,
        sortDir,
        estadoPago
      });
      const body = res?.data ?? {};
      setData(body.data ?? []);
      setTotal(body.meta?.total ?? 0);
      setPage(body.meta?.page ?? pg);
    } catch (err) {
      console.error('getVentas error', err);
      setError('Error al obtener las ventas');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortBy, sortDir]);

  useEffect(() => { fetchPage({ page: 1 }); /* eslint-disable-next-line */ }, [filters, sortBy, sortDir]);
  useEffect(() => { fetchPage({ page }); }, [page, fetchPage]);

  const handleApplyFilters = (f) => { setFilters(f); setPage(1); };
  const handleResetFilters = () => { setFilters({}); setPage(1); };

  const handleOpenCreate = () => { setEditing(null); setOpenForm(true); };
  const handleEdit = (row) => { setEditing(row); setOpenForm(true); };
  const handleView = (row) => { setDetailRow(row); setOpenDetail(true); };
  const handleDelete = (row) => { setToDelete(row); setOpenConfirm(true); };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      setLoading(true);
      await eliminarVenta(toDelete.idPedido ?? toDelete.id);
      setOpenConfirm(false);
      setToDelete(null);
      const remaining = total - 1;
      const totalPages = Math.max(1, Math.ceil(remaining / PER_PAGE));
      if (page > totalPages) setPage(totalPages);
      else fetchPage({ page });
    } catch (err) {
      console.error('eliminarVenta error', err);
      setError('No se pudo eliminar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (payload) => {
    try {
      setLoading(true);
      if (editing && (editing.idPedido || editing.id)) {
        const id = editing.idPedido ?? editing.id;
        await actualizarVenta(id, payload);
      } else {
        await crearVenta(payload);
      }
      setOpenForm(false);
      setEditing(null);
      if (!editing) setPage(1);
      fetchPage({ page: editing ? page : 1 });
    } catch (err) {
      console.error('save venta error', err);
      setError('Error al guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (row, campo, valor) => {
    try {
      setLoading(true);
      const id = row.idPedido ?? row.id;
      await actualizarVenta(id, { [campo]: valor });
      fetchPage({ page });
    } catch (err) {
      console.error('change status error', err);
      setError('No se pudo actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'idPedido', label: 'Pedido', width: 100, render: row => row.idPedido ?? row.id },
    { key: 'cliente', label: 'Cliente', render: row => row.cliente?.nombre ?? row.cliente ?? '—' },
    { key: 'total', label: 'Total', width: 120, render: row => `$ ${Number(row.total ?? 0).toFixed(2)}` },
    { key: 'estadoPago', label: 'Pago', width: 120, render: row => (
      <span style={{
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: row.estadoPago === 'pagado' ? '#e6fbef' : '#fff6e6',
        color: row.estadoPago === 'pagado' ? '#1f9d55' : '#b57a00',
        border: `1px solid ${tema.borde}`
      }}>{row.estadoPago ?? 'pendiente'}</span>
    )},
    { key: 'estadoEnvio', label: 'Envio', width: 140, render: row => (
      <span style={{
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: row.estadoEnvio === 'enviado' ? '#e6f5ff' : '#fff2f2',
        color: row.estadoEnvio === 'enviado' ? '#0b6cff' : '#e23a3a',
        border: `1px solid ${tema.borde}`
      }}>{row.estadoEnvio ?? 'pendiente'}</span>
    )},
    { key: 'fecha', label: 'Fecha', width: 160, render: row => new Date(row.fecha ?? row.createdAt).toLocaleString() }
  ];

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <FiltersPanel initial={filters} onApply={handleApplyFilters} onReset={handleResetFilters} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, color: tema.texto }}>Ventas</h2>
              <div style={{ color: tema.borde, marginTop: 6 }}>Gestión de pedidos y seguimiento</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleOpenCreate} style={{
                background: tema.primario, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700
              }}>Registrar venta</button>

              <button onClick={() => fetchPage({ page: 1 })} style={{
                background: tema.secundario, color: tema.texto, border: `1px solid ${tema.borde}`, padding: '10px 12px', borderRadius: 10, cursor: 'pointer'
              }}>Refrescar</button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={data}
            page={page}
            perPage={PER_PAGE}
            total={total}
            loading={loading}
            onPageChange={(p) => setPage(p)}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {error && <div style={{ color: '#a33', marginTop: 12 }}>{error}</div>}

      <FormModal open={openForm} title={editing ? 'Editar venta' : 'Registrar venta'} onClose={() => { setOpenForm(false); setEditing(null); }}>
        <VentaForm initial={editing} onCancel={() => { setOpenForm(false); setEditing(null); }} onSubmit={handleSubmitForm} onQuickStatusChange={handleChangeStatus} />
      </FormModal>

      <ConfirmDialog
        open={openConfirm}
        title="Eliminar venta"
        message={`¿Deseas eliminar el pedido "${toDelete?.idPedido ?? toDelete?.id}"? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setOpenConfirm(false); setToDelete(null); }}
      />

      <FormModal open={openDetail} title="Detalle de venta" onClose={() => setOpenDetail(false)}>
        <VentaDetail venta={detailRow} onChangeStatus={handleChangeStatus} />
      </FormModal>
    </div>
  );
};

export default VentasList;
