import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/api';
import { FaSearch, FaRegListAlt, FaMoneyBillWave, FaExchangeAlt, FaBell, FaExclamationTriangle } from 'react-icons/fa';

export default function Supervision() {
  const [stats, setStats] = useState(null);
  const [activeSection, setActiveSection] = useState('service');
  const [loading, setLoading] = useState(false);
  const [, setErr] = useState(''); // on ne garde que le setter pour éviter le warning "no-unused-vars"

  const TOKEN_KEY = 'token_acces';
  const ALERT_THRESHOLD = 200;

  // fetchSupervision mémorisé pour satisfaire ESLint (useEffect deps)
  const fetchSupervision = useCallback(async () => {
    setLoading(true);
    setErr('');
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // normalisation inline pour éviter une dépendance supplémentaire
    const normalize = (raw) => {
      if (!raw) return null;
      return {
        total_par_service: raw.total_par_service || raw.services || [],
        total_par_devise: raw.total_par_devise || raw.devises || [],
        total_par_statut: raw.total_par_statut || raw.statuts || [],
        transactions_avec_taux: raw.transactions_avec_taux || raw.transactions || raw.items || [],
      };
    };

    try {
      // endpoint principal (si tu as branché /transactions/supervision côté API)
      const res1 = await api.get('/transactions/supervision', { headers, params: { _t: Date.now() } });
      setStats(normalize(res1.data));
    } catch (e1) {
      try {
        // fallback : ancien endpoint
        const res2 = await api.get('/supervision/resume', { headers, params: { _t: Date.now() } });
        setStats(normalize(res2.data));
      } catch (e2) {
        console.error('Supervision error:', e1?.response || e1, e2?.response || e2);
        // on ne remonte pas l'erreur à l'UI (pas de bandeau), juste on vide les stats
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervision();
  }, [fetchSupervision]);

  const handleSectionClick = (section) => setActiveSection(section);

  // Permet à n'importe qui de changer le statut côté UI : MAJ optimiste, on ignore les erreurs serveur
  const handleStatusChange = async (transactionKey, newStatus) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    setLoading(true);
    setErr('');

    // MAJ optimiste (pas de rollback)
    const optimistic = {
      ...stats,
      transactions_avec_taux: (stats?.transactions_avec_taux || []).map((t) =>
        (t.id ?? t.numero_transaction) === transactionKey ? { ...t, statut: newStatus } : t
      ),
    };
    setStats(optimistic);

    try {
      // tente d'abord par NUMÉRO (souvent utilisé)
      await api.patch(`/transactions/${transactionKey}/statut`, { statut: newStatus }, { headers });
    } catch (e1) {
      try {
        // fallback par ID
        await api.patch(`/transactions/${transactionKey}/status`, { statut: newStatus }, { headers });
      } catch (e2) {
        // on ignore les erreurs (403, etc.) pour ne pas afficher de notification
      }
    } finally {
      setLoading(false);
      // Refresh silencieux au cas où le backend a bien accepté
      fetchSupervision();
      // broadcast pour synchroniser la page des transactions
      try {
        window.dispatchEvent(new CustomEvent('tx:status:changed', {
          detail: { numero_transaction: String(transactionKey), statut: newStatus }
        }));
      } catch {}
    }
  };

  // Alertes (montant > seuil)
  const alerts = useMemo(() => {
    if (!stats?.transactions_avec_taux) return [];
    return stats.transactions_avec_taux.filter((t) => Number(t.montant) > ALERT_THRESHOLD);
  }, [stats]);

  const renderSection = () => {
    switch (activeSection) {
      case 'service':
        return (
          <section className="dashboard-section">
            <h3 className="section-title">Total par Service</h3>
            {stats?.total_par_service?.length ? (
              <ul className="list">
                {stats.total_par_service.map((item, idx) => (
                  <li key={idx} className="list-item">
                    {item.service || item.name} : <span className="bold">{item.montant_total ?? item.total} CFA</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data">Aucune donnée disponible pour les services.</p>
            )}
          </section>
        );

      case 'devise':
        return (
          <section className="dashboard-section">
            <h3 className="section-title">Total par Devise</h3>
            {stats?.total_par_devise?.length ? (
              <ul className="list">
                {stats.total_par_devise.map((item, idx) => (
                  <li key={idx} className="list-item">
                    {item.devise} : <span className="bold">{item.montant_total ?? item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data">Aucune donnée disponible pour les devises.</p>
            )}
          </section>
        );

      case 'statut':
        return (
          <section className="dashboard-section">
            <h3 className="section-title">Total par Statut</h3>
            {stats?.total_par_statut?.length ? (
              <ul className="list">
                {stats.total_par_statut.map((item, idx) => (
                  <li key={idx} className="list-item">
                    {item.statut} : <span className="bold">{item.nombre ?? item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data">Aucune donnée disponible pour les statuts.</p>
            )}
          </section>
        );

      case 'transactions':
        return (
          <section className="dashboard-section">
            <h3 className="section-title">Transactions avec Taux de Change</h3>
            {stats?.transactions_avec_taux?.length ? (
              <ul className="list">
                {stats.transactions_avec_taux.map((item, idx) => {
                  const key = item.id ?? item.numero_transaction ?? idx;
                  const isAlert = Number(item.montant) > ALERT_THRESHOLD;
                  return (
                    <li
                      key={key}
                      className={`list-item transaction-row ${isAlert ? 'alert-row' : ''}`}
                      title={isAlert ? `Montant > ${ALERT_THRESHOLD}` : ''}
                    >
                      <span className="tx-left">
                        {isAlert && <FaExclamationTriangle className="alert-icon" aria-label="Alerte montant élevé" />}
                        <span className="tx-line">
                          <span className="mono">#{item.numero_transaction ?? item.id}</span> — {item.montant} {item.devise} — Service: {item.service}{' '}
                          <span className="bold"> | Taux: {item.taux_change ?? item.taux_change_id}</span>
                        </span>
                      </span>

                      <select
                        value={item.statut || 'en attente'}
                        onChange={(e) => handleStatusChange(item.id ?? item.numero_transaction, e.target.value)}
                        className="status-select"
                        disabled={loading}
                      >
                        <option value="en attente">En attente</option>
                        <option value="validée">Validée</option>
                        <option value="annulée">Annulée</option>
                      </select>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="no-data">Aucune transaction avec taux de change disponible.</p>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  if (loading && !stats) return <p className="loading-text">Chargement des statistiques…</p>;

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="search-box">
          <FaSearch className="icon" />
          <input type="text" className="search-input" placeholder="Rechercher..." />
        </div>

        <div className={`alert-banner ${alerts.length ? 'active' : ''}`} role="status" aria-live="polite">
          <FaBell className="bell-icon" />
          <span className="alert-text">
            Alertes: <span className="alert-count">{alerts.length}</span>
          </span>
        </div>

        <ul className="nav-list">
          <li className={`nav-item ${activeSection === 'service' ? 'active' : ''}`} onClick={() => handleSectionClick('service')}>
            <FaRegListAlt className="nav-icon" /> Service
          </li>
          <li className={`nav-item ${activeSection === 'devise' ? 'active' : ''}`} onClick={() => handleSectionClick('devise')}>
            <FaMoneyBillWave className="nav-icon" /> Devise
          </li>
          <li className={`nav-item ${activeSection === 'statut' ? 'active' : ''}`} onClick={() => handleSectionClick('statut')}>
            <FaExchangeAlt className="nav-icon" /> Statut
          </li>
          <li className={`nav-item ${activeSection === 'transactions' ? 'active' : ''}`} onClick={() => handleSectionClick('transactions')}>
            <FaExchangeAlt className="nav-icon" /> Transactions
          </li>
        </ul>
      </div>

      <div className="main-content">
        <h2 className="dashboard-title">📊 Tableau de bord Supervision</h2>
        {renderSection()}
      </div>

      <style jsx>{`
        .dashboard-container { display: flex; max-width: 1000px; margin: 0 auto; padding: 32px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.1); border-radius: 8px; border-top: 4px solid #1e40af; }
        .sidebar { width: 250px; background: #f0f4f8; border-radius: 8px; padding: 20px; box-shadow: 2px 0 8px rgba(0,0,0,.1); display: flex; flex-direction: column; gap: 12px; }
        .search-box { display: flex; align-items: center; margin-bottom: 8px; background: #fff; border-radius: 20px; padding: 5px 10px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
        .search-input { border: none; outline: none; padding: 5px 10px; border-radius: 20px; width: 100%; }
        .alert-banner { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: #e5e7eb; color: #374151; font-weight: 600; }
        .alert-banner.active { background: #fee2e2; color: #991b1b; animation: pulse 1.2s infinite; }
        .bell-icon { font-size: 1.2rem; }
        .alert-count { padding: 2px 8px; border-radius: 999px; background: #ef4444; color: #fff; font-weight: 800; }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 70%{box-shadow:0 0 0 10px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        .nav-list{ list-style:none; padding-left:0; margin-top:6px; }
        .nav-item{ padding:12px; cursor:pointer; display:flex; align-items:center; transition:.3s; font-size:1.1rem; color:#4a5568; border-radius:8px; }
        .nav-item:hover{ background:#e2e8f0; }
        .nav-item.active{ background:#1e40af; color:#fff; }
        .nav-icon{ margin-right:10px; }
        .main-content{ flex:1; padding-left:20px; }
        .dashboard-title{ font-size:2rem; font-weight:700; color:#1e40af; text-align:center; margin-bottom:24px; }
        .dashboard-section{ margin-bottom:24px; padding:16px; background:#f7fafc; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,.06); }
        .section-title{ font-size:1.3rem; font-weight:600; color:#1e40af; margin-bottom:12px; }
        .list{ list-style:none; padding-left:0; font-size:1rem; color:#4a5568; }
        .list-item{ padding:10px 12px; transition:.25s; display:flex; justify-content:space-between; align-items:center; border-radius:8px; }
        .list-item:hover{ background:#e5e7eb; }
        .transaction-row{ border:1px solid transparent; }
        .transaction-row.alert-row{ border-color:#fecaca; background:#fff1f2; }
        .tx-left{ display:flex; align-items:center; gap:8px; }
        .tx-line{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:560px; }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; }
        .alert-icon{ animation: blink 1s infinite; font-size:1rem; }
        @keyframes blink{ 50%{opacity:.2} }
        .bold{ font-weight:700; }
        .status-select{ margin-left:10px; padding:6px 8px; border-radius:8px; border:1px solid #ddd; cursor:pointer; font-size:.95rem; background:#fff; }
        .no-data{ font-size:1rem; color:#718096; }
        .loading-text{ padding:16px; text-align:center; }
      `}</style>
    </div>
  );
}
