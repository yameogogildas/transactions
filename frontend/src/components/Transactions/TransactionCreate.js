import React, { useState, useEffect } from 'react';
import api from '../../api/api';

export default function TransactionCreate() {
    const [form, setForm] = useState({
        montant: '',
        devise: 'USD',
        service: 'Western Union',
        numero_transaction: '',
        taux_change_id: '', // sera défini automatiquement
    });

    const [tauxList, setTauxList] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [solde, setSolde] = useState(1000);

    const devises = ['USD', 'CAD', 'EUR', 'XOF'];
    const services = ['Western Union', 'RIA', 'MoneyGram', 'PayPal'];

    const generateTransactionNumber = () => {
        const date = new Date();
        return `TXN-${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}-${date.getTime()}`;
    };

    useEffect(() => {
        const fetchTauxChange = async () => {
            try {
                const token = localStorage.getItem('token_acces');
                const response = await api.get('/taux-change/', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const taux = response.data;
                setTauxList(taux);

                // Appliquer le premier taux comme valeur par défaut
                if (taux.length > 0) {
                    setForm(prevForm => ({
                        ...prevForm,
                        numero_transaction: generateTransactionNumber(),
                        taux_change_id: taux[0].id // ✅ taux prérempli
                    }));
                } else {
                    setError("Aucun taux de change disponible.");
                }
            } catch (err) {
                console.error("Erreur lors du chargement des taux :", err);
                setError("Impossible de charger les taux de change.");
            }
        };

        fetchTauxChange();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (!form.montant || !form.devise || !form.service || !form.numero_transaction || !form.taux_change_id) {
            setError('Tous les champs doivent être remplis.');
            return false;
        }

        if (isNaN(form.montant) || form.montant <= 0) {
            setError('Le montant doit être un nombre valide et supérieur à zéro.');
            return false;
        }

        if (form.montant > solde) {
            setError('Le montant dépasse le solde disponible.');
            return false;
        }

        if (!isValidTauxChangeId(form.taux_change_id)) {
            setError('Le taux de change est invalide.');
            return false;
        }

        setError('');
        return true;
    };

    const isValidTauxChangeId = (tauxId) => {
        return tauxList.some(t => t.id === Number(tauxId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (solde > 5000) {
            alert('Alerte : Votre solde est très élevé!');
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token_acces');
            await api.post('/transactions/', form, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Transaction créée avec succès');

            setForm({
                montant: '',
                devise: 'USD',
                service: 'Western Union',
                numero_transaction: generateTransactionNumber(),
                taux_change_id: tauxList[0]?.id || ''
            });

            setSolde(prev => prev - parseFloat(form.montant));
        } catch (error) {
            console.error('Erreur création transaction:', error);
            setError('Une erreur est survenue lors de la création de la transaction. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2 className="header">Créer une Transaction</h2>
            {error && <p className="error">{error}</p>}

            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <input
                        name="montant"
                        placeholder="Montant"
                        value={form.montant}
                        onChange={handleChange}
                        className="input"
                    />
                </div>
                <div className="form-group">
                    <select
                        name="devise"
                        value={form.devise}
                        onChange={handleChange}
                        className="input"
                    >
                        {devises.map(devise => (
                            <option key={devise} value={devise}>{devise}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <select
                        name="service"
                        value={form.service}
                        onChange={handleChange}
                        className="input"
                    >
                        {services.map(service => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <input
                        name="numero_transaction"
                        placeholder="Numéro Transaction"
                        value={form.numero_transaction}
                        onChange={handleChange}
                        className="input"
                        disabled
                    />
                </div>
                <div className="form-group">
                    <select
                        name="taux_change_id"
                        value={form.taux_change_id}
                        onChange={handleChange}
                        className="input"
                        required
                    >
                        {tauxList.map(taux => (
                            <option key={taux.id} value={taux.id}>
                                {taux.source} → {taux.cible} @ {taux.taux}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="button-container">
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? 'Création en cours...' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    );
}
