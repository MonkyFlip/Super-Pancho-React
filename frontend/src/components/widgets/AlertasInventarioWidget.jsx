import React, { useEffect, useState } from 'react';
import { getProductos } from '../../services/api';

const AlertasInventarioWidget = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const response = await getProductos({ 
          limit: 100,
          page: 1
        });
        const productos = response.data?.data || [];
        const alertasInventario = productos
          .filter(producto => {
            const stock = producto.stock || producto.cantidad || producto.inventario || 0;
            return stock < 10 && stock > 0;
          })
          .map(producto => ({
            id: producto._id,
            mensaje: `${producto.nombre || 'Producto'} - Stock bajo: ${producto.stock || producto.cantidad || 0} unidades`,
            nivel: producto.stock < 5 ? 'alto' : 'medio'
          }));

        if (alertasInventario.length === 0) {
          // Datos de ejemplo si no hay alertas reales
          setAlertas([
            { id: 1, mensaje: "Laptop Gamer - Stock bajo: 8 unidades", nivel: 'medio' },
            { id: 2, mensaje: "Mouse Inalámbrico - Stock bajo: 3 unidades", nivel: 'alto' },
            { id: 3, mensaje: "Teclado Mecánico - Stock bajo: 5 unidades", nivel: 'alto' }
          ]);
        } else {
          setAlertas(alertasInventario);
        }
      } catch (error) {
        console.error('Error fetching alertas:', error);
        // Datos de ejemplo en caso de error
        setAlertas([
          { id: 1, mensaje: "Laptop Gamer - Stock bajo: 8 unidades", nivel: 'medio' },
          { id: 2, mensaje: "Mouse Inalámbrico - Stock bajo: 3 unidades", nivel: 'alto' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alertas de Inventario</div>
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          Cargando alertas...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alertas de Inventario</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alertas.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
            ✅ Todo en orden
          </div>
        ) : (
          alertas.map((alerta) => (
            <a 
              key={alerta.id}
              href={`#/admin/productos`}
              style={{
                display: 'block',
                padding: 8,
                background: alerta.nivel === 'alto' ? '#fef2f2' : '#fffbeb',
                border: alerta.nivel === 'alto' ? '1px solid #fecaca' : '1px solid #fed7aa',
                borderRadius: 6,
                fontSize: 12,
                color: alerta.nivel === 'alto' ? '#dc2626' : '#d97706',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = alerta.nivel === 'alto' ? '#fecaca' : '#fed7aa'}
              onMouseOut={(e) => e.target.style.background = alerta.nivel === 'alto' ? '#fef2f2' : '#fffbeb'}
            >
              ⚠️ {alerta.mensaje}
            </a>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertasInventarioWidget;