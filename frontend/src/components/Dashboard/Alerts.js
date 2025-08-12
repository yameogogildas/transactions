import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function Alerts() {
    const [alertes, setAlertes] = useState([]);

    useEffect(() => {
        fetchAlertes();
    }, []);

    const fetchAlertes = async () => {
        try {
            const response = await api.get('/supervision/alertes');
            setAlertes(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des alertes:', error);
        }
    };

    return (
        <div>
            <h2>Alertes Détectées</h2>
            {alertes.length === 0 ? (
                <p>Aucune alerte détectée.</p>
            ) : (
                alertes.map((alerte, index) => (
                    <div key={index} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
                        <h3>Type d'alerte: {alerte.type}</h3>
                        {alerte.transactions && (
                            <div>
                                <h4>Transactions Concernées:</h4>
                                <ul>
                                    {alerte.transactions.map(tx => (
                                        <li key={tx.id}>Transaction #{tx.id} - Montant: {tx.montant} {tx.devise}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {alerte.details && (
                            <div>
                                <h4>Détails:</h4>
                                <ul>
                                    {alerte.details.map((detail, idx) => (
                                        <li key={idx}>Utilisateur ID: {detail.utilisateur_id}, Nombre de transactions: {detail.nb_transactions}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
