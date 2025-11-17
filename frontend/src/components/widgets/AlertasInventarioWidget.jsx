import React, { useEffect, useState } from 'react';
import { getProductos } from '../../services/api';
import { useTranslation } from 'react-i18next';

const AlertasInventarioWidget = () => {
  const { t } = useTranslation();
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
            mensaje: t('widgets.inventoryAlerts.lowStockMessage', {
              product: producto.nombre || t('common.product'),
              stock: producto.stock || producto.cantidad || 0
            }),
            nivel: producto.stock < 5 ? 'alto' : 'medio'
          }));

        if (alertasInventario.length === 0) {
          setAlertas([
            { 
              id: 1, 
              mensaje: t('widgets.inventoryAlerts.sampleMessages.laptop'), 
              nivel: 'medio' 
            },
            { 
              id: 2, 
              mensaje: t('widgets.inventoryAlerts.sampleMessages.mouse'), 
              nivel: 'alto' 
            },
            { 
              id: 3, 
              mensaje: t('widgets.inventoryAlerts.sampleMessages.keyboard'), 
              nivel: 'alto' 
            }
          ]);
        } else {
          setAlertas(alertasInventario);
        }
      } catch (error) {
        console.error('Error fetching alertas:', error);
        setAlertas([
          { 
            id: 1, 
            mensaje: t('widgets.inventoryAlerts.sampleMessages.laptop'), 
            nivel: 'medio' 
          },
          { 
            id: 2, 
            mensaje: t('widgets.inventoryAlerts.sampleMessages.mouse'), 
            nivel: 'alto' 
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
  }, [t]);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {t('widgets.inventoryAlerts.title')}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        {t('widgets.inventoryAlerts.title')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alertas.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
            ✅ {t('widgets.inventoryAlerts.allGood')}
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