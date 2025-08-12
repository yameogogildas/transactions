import React, { useState } from 'react';
import api from '../../api/api';

export default function TransactionStatusUpdate() {
    const [transactionId, setTransactionId] = useState('');
    const [statut, setStatut] = useState('');

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token_acces');
            await api.patch(`/transactions/${transactionId}/statut`, { statut }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Statut mis à jour');
        } catch (error) {
            console.error('Erreur mise à jour statut:', error);
        }
    };

    return (
        <div className="container">
            <h2 className="header">Mettre à jour le statut d'une Transaction</h2>
            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <input
                        className="input"
                        placeholder="ID Transaction"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <select
                        className="input"
                        value={statut}
                        onChange={e => setStatut(e.target.value)}
                    >
                        <option value="">Sélectionnez un statut</option>
                        <option value="validée">Validée</option>
                        <option value="annulée">Annulée</option>
                    </select>
                </div>
                <div className="button-container">
                    <button type="submit" className="submit-button">
                        Mettre à jour
                    </button>
                </div>
            </form>

            {/* CSS intégré pour la mise en forme */}
            <style>{`
                .container {
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                    background-color: #f9fafb;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .header {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 24px;
                    text-align: center;
                }

                .form {
                    display: grid;
                    gap: 16px;
                }

                .form-group {
                    margin-bottom: 16px;
                }

                .input {
                    padding: 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    width: 100%;
                    font-size: 1rem;
                    background-color: white;
                    transition: border-color 0.3s ease;
                }

                .input:focus {
                    border-color: #2563eb;
                    outline: none;
                }

                .button-container {
                    text-align: center;
                }

                .submit-button {
                    padding: 12px 24px;
                    background-color: #2563eb;
                    color: white;
                    font-weight: bold;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                .submit-button:hover {
                    background-color: #1e40af;
                }

                .submit-button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .container {
                        padding: 16px;
                    }

                    .input {
                        font-size: 0.9rem;
                    }

                    .submit-button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
