import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import { FaFilter, FaPlus } from 'react-icons/fa';

// ---- utils ----
const pad2 = (n) => String(n).padStart(2, '0');
const getToken = () => localStorage.getItem('token') || localStorage.getItem('token_acces');

const generateTransactionNumber = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const ts = date.getTime(); // garantit l’unicité
  return `TXN-${y}${m}${d}-${ts}`;
};

export default function TransactionCreate() {
  const [form, setForm] = useState({
    montant: '',
    devise: 'USD',
    service: 'Western Union',
    numero_transaction: generateTransactionNumber(),
    taux_change_id: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [solde, setSolde] = useState(1000);
  const [tauxList, setTauxList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const devises = ['USD', 'CAD', 'EUR', 'XOF'];
  const services = ['Western Union', 'RIA', 'MoneyGram', 'PayPal'];

  const getTauxChangeId = useCallback(
    (devise) => {
      const taux = tauxList.find((item) => item?.devise_source === devise);
      return taux ? taux.id : '';
    },
    [tauxList]
  );

  // Initial load
  useEffect(() => {
    fetchTauxChanges();
    fetchTransactions();

    // Polling + refresh au retour d’onglet
    const id = setInterval(fetchTransactions, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchTransactions();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Écoute le broadcast de Supervision (tx:status:changed)
    const onStatusChanged = (e) => {
      try {
        const { numero_transaction, statut } = e.detail || {};
        if (!numero_transaction) return;
        // MAJ locale immédiate (optimiste)
        setTransactions((prev) =>
          prev.map((t) =>
            t.numero_transaction === numero_transaction ? { ...t, statut } : t
          )
        );
        setFilteredTransactions((prev) =>
          prev.map((t) =>
            t.numero_transaction === numero_transaction ? { ...t, statut } : t
          )
        );
        // puis on refetch pour se resynchroniser 100%
        fetchTransactions();
      } catch {
        // ignore si event mal formé
      }
    };
    window.addEventListener('tx:status:changed', onStatusChanged);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('tx:status:changed', onStatusChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTauxChanges = async () => {
    try {
      const token = getToken();
      const res = await api.get('/tauxchange/', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { _t: Date.now() }, // anti-cache
      });
      setTauxList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur lors de la récupération des taux de change:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = getToken();
      const res = await api.get('/transactions/', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { _t: Date.now() }, // anti-cache
      });
      const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      // tri par date desc si dispo
      items.sort((a, b) => {
        const da = a?.date_transaction ? new Date(a.date_transaction).getTime() : 0;
        const db = b?.date_transaction ? new Date(b.date_transaction).getTime() : 0;
        if (db !== da) return db - da;
        return String(b?.numero_transaction || '').localeCompare(String(a?.numero_transaction || ''));
      });

      setTransactions(items);
      setFilteredTransactions((prev) => {
        if (!search.trim()) return items;
        return applySearch(items, search);
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des transactions:', err);
    }
  };

  // Quand la devise change, met à jour le taux_change_id automatiquement
  useEffect(() => {
    const tauxId = getTauxChangeId(form.devise);
    setForm((prevForm) => ({
      ...prevForm,
      taux_change_id: tauxId,
    }));
  }, [form.devise, getTauxChangeId]);

  // ⚠️ AJOUT : quand la liste des taux arrive pour la première fois,
  // si le champ est vide on le renseigne pour la devise actuelle.
  useEffect(() => {
    if (!form.taux_change_id && tauxList.length > 0) {
      const tauxId = getTauxChangeId(form.devise);
      if (tauxId) {
        setForm((prev) => ({ ...prev, taux_change_id: tauxId }));
      }
    }
  }, [tauxList, form.taux_change_id, form.devise, getTauxChangeId]);

  // Recherche
  const applySearch = (list, q) => {
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((t) => {
      const num = (t?.numero_transaction || '').toLowerCase();
      const dev = (t?.devise || '').toLowerCase();
      const srv = (t?.service || '').toLowerCase();
      const st = (t?.statut || '').toLowerCase();
      const mt = String(t?.montant ?? '').toLowerCase();
      return num.includes(s) || dev.includes(s) || srv.includes(s) || st.includes(s) || mt.includes(s);
    });
  };

  // Recalcul filtrage quand transactions/search changent
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(applySearch(transactions, search));
    }
  }, [transactions, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.montant || !form.devise || !form.service || !form.numero_transaction || !form.taux_change_id) {
      setError('Tous les champs doivent être remplis.');
      return false;
    }
    const montantNum = Number(form.montant);
    if (Number.isNaN(montantNum) || montantNum <= 0) {
      setError('Le montant doit être un nombre valide et supérieur à zéro.');
      return false;
    }
    if (montantNum > solde) {
      setError('Le montant dépasse le solde disponible.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = getToken();
      const payload = {
        ...form,
        montant: Number(form.montant),
      };

      await api.post('/transactions/', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      alert('Transaction créée avec succès');

      setForm({
        montant: '',
        devise: 'USD',
        service: 'Western Union',
        numero_transaction: generateTransactionNumber(),
        taux_change_id: getTauxChangeId('USD'),
      });

      setSolde((prev) => prev - Number(payload.montant));
      await fetchTransactions();
    } catch (err) {
      console.error('Erreur création transaction:', err);
      setError(
        err?.response?.data?.detail ||
          'Une erreur est survenue lors de la création de la transaction. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => setSearch(e.target.value);

  return (
    <div className="container">
      <h2 className="header">Créer une Transaction</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-group">
          <label>Montant</label>
          <input
            name="montant"
            type="number"
            step="0.01"
            min="0"
            placeholder="Montant"
            value={form.montant}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label>Devise</label>
          <select
            name="devise"
            value={form.devise}
            onChange={handleChange}
            className="input"
          >
            {devises.map((devise) => (
              <option key={devise} value={devise}>
                {devise}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Service</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className="input"
          >
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Numéro Transaction</label>
          <input
            name="numero_transaction"
            value={form.numero_transaction}
            className="input"
            disabled
          />
        </div>

        <div className="form-group">
          <label>Taux de Change ID</label>
          <input
            name="taux_change_id"
            value={form.taux_change_id}
            className="input"
            disabled
          />
        </div>

        <div className="button-container">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Création en cours...' : 'Créer'}
          </button>
        </div>
      </form>

      <h3>Liste des Transactions</h3>
      <div className="search-filter">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher une transaction"
          className="search-input"
        />
        <button
          className="filter-button"
          onClick={() => fetchTransactions()}
          title="Rafraîchir la liste"
        >
          <FaFilter /> Filtrer
        </button>
        <button
          className="add-transaction-button"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              numero_transaction: generateTransactionNumber(),
            }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <FaPlus /> Ajouter
        </button>
      </div>

      <table className="transactions-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Montant</th>
            <th>Devise</th>
            <th>Service</th>
            <th>Statut</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 16 }}>
                Aucune transaction.
              </td>
            </tr>
          ) : (
            filteredTransactions.map((transaction) => (
              <tr key={transaction.numero_transaction /* clé stable */}>
                <td>{transaction.numero_transaction}</td>
                <td>{transaction.montant}</td>
                <td>{transaction.devise}</td>
                <td>{transaction.service}</td>
                <td>{transaction.statut || 'en attente'}</td>
                <td>
                  {transaction.date_transaction
                    ? new Date(transaction.date_transaction).toLocaleString()
                    : transaction.created_at
                    ? new Date(transaction.created_at).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style>{`
        .container { max-width: 900px; margin: auto; padding: 30px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .header { font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 24px; text-align: center; }
        .form-group { margin-bottom: 16px; }
        .form-group label { font-weight: bold; margin-bottom: 5px; display: block; }
        .input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; width: 100%; font-size: 1rem; background-color: #fff; transition: border-color 0.3s ease; }
        .input:focus { border-color: #2563eb; outline: none; }
        .button-container { text-align: center; margin-top: 20px; }
        .submit-button { padding: 12px 24px; background-color: #2563eb; color: white; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.3s; }
        .submit-button:disabled { background-color: #ccc; cursor: not-allowed; }
        .transactions-table { width: 100%; margin-top: 30px; border-collapse: collapse; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .transactions-table th, .transactions-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .transactions-table th { background-color: #f1f5f9; font-weight: bold; }
        .search-filter { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .search-input { padding: 10px 16px; border-radius: 8px; border: 1px solid #ddd; flex: 1; font-size: 1rem; }
        .filter-button, .add-transaction-button { padding: 10px 20px; background-color: #2563eb; color: white; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; transition: background-color 0.3s ease; }
        .filter-button:hover, .add-transaction-button:hover { background-color: #1e40af; }
        .filter-button svg, .add-transaction-button svg { margin-right: 8px; }
        .error { color: red; font-weight: bold; margin-bottom: 16px; text-align: center; }
      `}</style>
    </div>
  );
}
