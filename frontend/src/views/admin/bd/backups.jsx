import React, { useEffect, useState } from 'react';
import { FaDatabase, FaCloudDownloadAlt, FaHistory, FaSpinner, FaFileArchive, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
// Importamos las funciones nombradas desde tu api.jsx
import { generarBackup, getBackups, getBackupDownloadUrl } from '../../../services/api';

const BackupsView = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showInfoMsg, setShowInfoMsg] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      // Usamos la función del servicio
      const res = await getBackups();
      if (res.data.ok) {
        setBackups(res.data.backups);
      }
    } catch (error) {
      console.error("Error cargando backups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarBackup = async () => {
    // Mostrar mensaje informativo
    setShowInfoMsg(true);
    setCreating(true);
    setErrorMsg(null);
    
    try {
      // Usamos la función del servicio que apunta a /api/backups/generar
      const res = await generarBackup();
      
      if (res.data.ok) {
        // Refrescamos la lista
        fetchBackups();
        alert("Backup creado correctamente.");
      }
    } catch (error) {
      console.error(error);
      // Capturamos mensaje del backend si existe
      const serverMessage = error.response?.data?.message || error.message;
      setErrorMsg(`Error: ${serverMessage}`);
    } finally {
      setCreating(false);
      // Ocultar mensaje informativo después de un tiempo
      setTimeout(() => {
        setShowInfoMsg(false);
      }, 3000);
    }
  };

  const handleDescargar = (id) => {
    // Usamos el helper para obtener la URL correcta
    const url = getBackupDownloadUrl(id);
    window.open(url, '_blank');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px', color: '#333' }}>
        <FaDatabase style={{ marginRight: '10px' }} />
        Copias de Seguridad
      </h2>
      
      {/* Mensaje de error visual */}
      {errorMsg && (
        <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '6px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <FaExclamationTriangle /> {errorMsg}
        </div>
      )}

      {/* Mensaje informativo cuando se genera backup */}
      {showInfoMsg && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#e3f2fd', 
          color: '#1565c0', 
          borderRadius: '6px', 
          marginBottom: '15px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          border: '1px solid #bbdefb'
        }}>
          <FaInfoCircle /> 
          <div>
            <strong>Generando backup...</strong>
            <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
              Esta acción puede tardar varios minutos. Por favor, no cierre esta ventana.
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', marginBottom: '30px' }}>
          <button 
            onClick={handleGenerarBackup}
            disabled={creating}
            style={{ 
              padding: '12px 24px', 
              background: creating ? '#90CAF9' : '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: creating ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              fontSize: '1rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
              {creating ? <FaSpinner className="icon-spin" /> : <FaCloudDownloadAlt />} 
              {creating ? 'Generando Backup...' : 'Generar Nuevo Backup'}
          </button>
      </div>

      <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555' }}>
            <FaHistory /> Historial en la Nube
        </h3>
        
        {loading ? (
            <p>Cargando historial...</p>
        ) : backups.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No hay backups disponibles.</p>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {backups.map((bk) => (
                    <div key={bk.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '15px',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        background: '#f8f9fa'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ fontSize: '24px', color: '#FF9800' }}><FaFileArchive /></div>
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#333' }}>{bk.filename}</div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                    {new Date(bk.date).toLocaleString()} • {formatSize(bk.size)}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDescargar(bk.id)}
                            style={{
                                padding: '8px 16px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Descargar
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
      <style>{`
        .icon-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BackupsView;