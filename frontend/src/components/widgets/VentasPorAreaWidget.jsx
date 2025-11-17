import React, { useEffect, useState } from 'react';
import { getReporteVentasPorArea } from '../../services/api';
import { useTranslation } from 'react-i18next';

const VentasPorAreaWidget = ({ height = 250 }) => {
  const { t } = useTranslation();
  const [ventasPorArea, setVentasPorArea] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const colores = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    const fetchVentasPorArea = async () => {
      try {
        const response = await getReporteVentasPorArea();
        const ventasData = response.data?.data || [];
        
        if (ventasData.length === 0) {
          throw new Error("No hay datos de ventas por área");
        }

        const totalVendido = ventasData.reduce((acc, item) => acc + item.valueRaw, 0);

        const ventasFormateadas = ventasData.map((area, index) => {
          return {
            id: area.id,
            label: area.label,
            percentage: totalVendido > 0 ? (area.valueRaw / totalVendido) * 100 : 0,
            color: colores[index] || '#94a3b8',
            ventas: `$${area.valueRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          };
        });
        
        setVentasPorArea(ventasFormateadas);

      } catch (error) {
        console.error('Error fetching ventas por area:', error);
        setVentasPorArea([
          { id: 1, label: t('widgets.salesByArea.sampleAreas.electronics'), percentage: 45, color: '#3b82f6', ventas: '$8,430' },
          { id: 2, label: t('widgets.salesByArea.sampleAreas.groceries'), percentage: 25, color: '#ef4444', ventas: '$4,680' },
          { id: 3, label: t('widgets.salesByArea.sampleAreas.home'), percentage: 15, color: '#10b981', ventas: '$2,810' },
          { id: 4, label: t('widgets.salesByArea.sampleAreas.clothing'), percentage: 10, color: '#f59e0b', ventas: '$1,870' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchVentasPorArea();
  }, [t]);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          {t('widgets.salesByArea.title')}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          {t('widgets.salesByArea.loading')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        {t('widgets.salesByArea.title')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ventasPorArea.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: item.color
            }} />
            <div style={{ flex: 1, fontSize: 12 }}>{item.label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{item.percentage.toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: '#94a3b8', minWidth: 50 }}>{item.ventas}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VentasPorAreaWidget;