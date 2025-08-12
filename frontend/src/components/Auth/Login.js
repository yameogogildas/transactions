import React, { useState } from 'react';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaGlobeAfrica } from 'react-icons/fa';
import { SiWesternunion, SiMoneygram } from 'react-icons/si';

// Nettoyage du token en arrivant sur la page
localStorage.removeItem('token');
localStorage.removeItem('user_role');

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [mot_de_passe, setMotDePasse] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !mot_de_passe) {
            setError("Tous les champs doivent être remplis.");
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/authentification/connexion', {
                email,
                mot_de_passe
            });

            localStorage.setItem('token', data.token_acces);
            localStorage.setItem('user_role', data.role);
            setError('');

            if (onLogin) onLogin(data);

            switch (data.role) {
                case 'client':
                    navigate('/transactions');
                    break;
                case 'agent':
                    navigate('/tauxchange');
                    break;
                case 'service':
                    navigate('/supervision');
                    break;
                default:
                    navigate('/');
            }
        } catch (err) {
            setError('Connexion échouée. Vérifiez vos informations.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>🔐 Connexion sécurisée</h2>
                {error && <p style={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={styles.inputGroup}>
                        <label htmlFor="email" style={styles.label}>Email</label>
                        <div style={styles.inputWrapper}>
                            <FaEnvelope style={styles.icon} />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={email}
                                placeholder="Votre adresse email"
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* Mot de passe */}
                    <div style={styles.inputGroup}>
                        <label htmlFor="mot_de_passe" style={styles.label}>Mot de passe</label>
                        <div style={styles.inputWrapper}>
                            <FaLock style={styles.icon} />
                            <input
                                type="password"
                                id="mot_de_passe"
                                name="mot_de_passe"
                                value={mot_de_passe}
                                placeholder="Votre mot de passe"
                                onChange={(e) => setMotDePasse(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* Bouton */}
                    <div style={{ marginTop: 20 }}>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? "Connexion en cours..." : "Se connecter"}
                        </button>
                    </div>
                </form>

                {/* Logos RIA/MoneyGram */}
                <div style={styles.logoSection}>
                    <p style={{ color: '#6b7280' }}>Compatible avec :</p>
                    <div style={styles.logoRow}>
                        <SiMoneygram size={30} color="#d60a2e" />
                        <SiWesternunion size={30} color="#ffcc00" />
                        <FaGlobeAfrica size={28} color="#2563eb" />
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        padding: '40px 30px',
        borderRadius: 16,
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
        color: '#1f2937',
    },
    error: {
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        padding: '10px',
        marginBottom: 20,
        borderRadius: 8,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        display: 'block',
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #d1d5db',
        paddingBottom: 4,
    },
    icon: {
        color: '#6b7280',
        marginRight: 10,
    },
    input: {
        flex: 1,
        border: 'none',
        outline: 'none',
        padding: '8px 0',
        fontSize: 16,
        color: '#1f2937',
    },
    button: {
        width: '100%',
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '12px',
        borderRadius: 8,
        border: 'none',
        fontWeight: '600',
        fontSize: 16,
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    logoSection: {
        marginTop: 40,
        textAlign: 'center',
    },
    logoRow: {
        marginTop: 10,
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
    }
};
