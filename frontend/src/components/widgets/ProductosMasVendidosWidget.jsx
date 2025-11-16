import React, { useEffect, useState } from 'react';
import { getTopProductos } from '../../services/api';

const ProductosMasVendidosWidget = ({ height = 250 }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductosMasVendidos = async () => {
      try {
        const response = await getTopProductos(); 
        const productosData = response.data?.data || [];
        
        if (productosData.length === 0) {
          throw new Error("No hay datos de ventas");
        }

        setProductos(productosData);

      } catch (error) {
        console.error('Error fetching productos mas vendidos:', error);
        // Datos de ejemplo
        setProductos([
          { id: 1, label: 'Laptop Gamer', value: '$2,340', percentage: 100, ventas: 45 },
          { id: 2, label: 'Smartphone Pro', value: '$1,890', percentage: 80, ventas: 38 },
          { id: 3, label: 'Tablet Elite', value: '$1,230', percentage: 65, ventas: 29 },
          { id: 4, label: 'Monitor 4K', value: '$980', percentage: 52, ventas: 23 },
          { id: 5, label: 'Teclado Mecánico', value: '$760', percentage: 45, ventas: 18 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductosMasVendidos();
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Top Productos Más Vendidos</div>
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          Cargando productos...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, height }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Top Productos Más Vendidos (Semana)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {productos.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 12, color: '#64748b' }}>{item.label}</div>
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: `${item.percentage}%`,
                height: 20,
                background: '#3b82f6',
                borderRadius: 4,
                transition: 'width 0.5s ease'
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', minWidth: 30 }}>({item.ventas})</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductosMasVendidosWidget;