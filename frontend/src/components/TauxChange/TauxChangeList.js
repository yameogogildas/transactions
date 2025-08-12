import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react'; // Utilisation correcte du QRCodeCanvas

const DEVISES_PAR_DEFAUT = ['USD', 'CAD', 'EUR', 'XOF', 'GBP', 'NGN', 'CFA'];

export default function TauxChangeList() {
    const [tauxList, setTauxList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [form, setForm] = useState({ devise_source: 'USD', devise_cible: 'XOF', taux: 1.0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const tauxPerPage = 5;
    const qrCodeRef = useRef(null);  // Référence du QRCodeCanvas

    const handleSearch = useCallback((term) => {
        const lower = term.toLowerCase();
        const filtered = tauxList.filter(t =>
            t.devise_source.toLowerCase().includes(lower) ||
            t.devise_cible.toLowerCase().includes(lower)
        );
        setFilteredList(filtered);
        setCurrentPage(1);
    }, [tauxList]);

    const fetchTauxChanges = async () => {
        try {
            const token = localStorage.getItem('token_acces');
            const res = await api.get('/tauxchange/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTauxList(res.data);
        } catch (error) {
            console.error('Erreur lors du chargement des taux de change:', error);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.devise_source === form.devise_cible) {
            setError("La devise source et la devise cible doivent être différentes.");
            return;
        }

        const token = localStorage.getItem('token_acces');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (isEditing) {
                await api.put(`/tauxchange/${editId}`, form, { headers });
            } else {
                await api.post('/tauxchange/', form, { headers });
            }
            setForm({ devise_source: 'USD', devise_cible: 'XOF', taux: 1.0 });
            setIsEditing(false);
            setEditId(null);
            fetchTauxChanges();
        } catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            if (status === 409) {
                setError("Ce taux de change existe déjà.");
            } else if (status === 400 && detail) {
                setError(detail);
            } else {
                setError("Erreur lors de l'enregistrement du taux.");
            }
            console.error(err);
        }
    };

    const handleEdit = (taux) => {
        setForm({
            devise_source: taux.devise_source,
            devise_cible: taux.devise_cible,
            taux: taux.taux
        });
        setIsEditing(true);
        setEditId(taux.id);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer ce taux de change ?")) return;

        const token = localStorage.getItem('token_acces');
        try {
            await api.delete(`/tauxchange/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTauxChanges();
        } catch (err) {
            setError("Erreur lors de la suppression.");
            console.error(err);
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tauxList);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Taux de Change');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, 'taux_de_change.xlsx');
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Taux de Change', 14, 16);

        // Créer un tableau avec les données
        const rows = tauxList.map(t => [t.devise_source, t.devise_cible, t.taux]);

        // Utiliser autoTable pour ajouter le tableau au PDF
        doc.autoTable({
            head: [['Devise Source', 'Devise Cible', 'Taux']],
            body: rows,
            startY: 30,
        });

        // Générer un QR Code à partir du canvas
        const qrCodeCanvas = qrCodeRef.current.querySelector('canvas');  // Obtenez l'élément canvas du QRCodeCanvas

        if (qrCodeCanvas) {
            const qrCodeDataUrl = qrCodeCanvas.toDataURL('image/png');  // Convertir le canvas en image base64

            // Ajouter le QR Code au PDF (positionné à la droite du tableau)
            doc.addImage(qrCodeDataUrl, 'PNG', 150, 30, 30, 30);  // Positionner le QR Code dans le PDF
        }

        doc.save('taux_de_change.pdf');
    };

    const indexOfLast = currentPage * tauxPerPage;
    const indexOfFirst = indexOfLast - tauxPerPage;
    const currentTaux = filteredList.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredList.length / tauxPerPage);

    useEffect(() => {
        fetchTauxChanges();
    }, []);

    useEffect(() => {
        handleSearch(searchTerm);
    }, [searchTerm, tauxList, handleSearch]);

    return (
        <div style={{ maxWidth: '1100px', margin: 'auto', padding: '30px', background: '#f9fafb', minHeight: '100vh' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#1f2937' }}>
                💱 Gestion des Taux de Change
            </h2>

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', marginBottom: '1rem', borderRadius: '6px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <select name="devise_source" value={form.devise_source} onChange={handleChange} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required>
                    <option value="">-- Devise Source --</option>
                    {DEVISES_PAR_DEFAUT.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                </select>
                <select name="devise_cible" value={form.devise_cible} onChange={handleChange} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required>
                    <option value="">-- Devise Cible --</option>
                    {DEVISES_PAR_DEFAUT.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                </select>
                <input type="number" name="taux" step="0.0001" value={form.taux} onChange={handleChange} placeholder="Taux" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                <button type="submit" style={{ gridColumn: 'span 3', backgroundColor: '#2563eb', color: 'white', padding: '10px', borderRadius: '6px', fontWeight: 'bold' }}>
                    {isEditing ? 'Mettre à jour le taux' : 'Ajouter un taux'}
                </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <input type="text" placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', flexGrow: 1 }} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={exportToExcel} style={{ backgroundColor: '#059669', color: 'white', padding: '10px 15px', borderRadius: '6px' }}>Exporter Excel</button>
                    <button onClick={exportToPDF} style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px 15px', borderRadius: '6px' }}>Exporter PDF</button>
                </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>📋 Liste des Taux</h3>
            <ul style={{ marginBottom: '2rem' }}>
                {currentTaux.map(taux => (
                    <li key={taux.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'white',
                        padding: '12px',
                        marginBottom: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ color: '#374151', fontWeight: '500' }}>
                            {taux.devise_source} → {taux.devise_cible} : {taux.taux}
                        </span>
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            (ID: {taux.id}) {/* Affiche l'ID */}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEdit(taux)} style={{ backgroundColor: '#facc15', color: 'white', padding: '6px 12px', borderRadius: '5px', fontSize: '0.9rem' }}>Modifier</button>
                            <button onClick={() => handleDelete(taux.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '5px', fontSize: '0.9rem' }}>Supprimer</button>
                        </div>
                    </li>
                ))}
            </ul>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} style={{
                        padding: '6px 12px',
                        borderRadius: '5px',
                        backgroundColor: currentPage === i + 1 ? '#2563eb' : '#e5e7eb',
                        color: currentPage === i + 1 ? 'white' : 'black'
                    }}>
                        {i + 1}
                    </button>
                ))}
            </div>

            {/* QR Code Canvas */}
            <div style={{ display: 'none' }}>
                <QRCodeCanvas ref={qrCodeRef} value="https://example.com" size={100} />
            </div>
        </div>
    );
}
