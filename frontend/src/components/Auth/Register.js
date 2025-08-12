import React, { useState } from 'react';
import api from '../../api/api';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { SiWesternunion, SiMoneygram } from 'react-icons/si';

export default function Register() {
    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        mot_de_passe: '',
        role: 'client' // Défini par défaut et invisible
    });

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nom || !formData.email || !formData.mot_de_passe) {
            setError('Tous les champs doivent être remplis.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/authentification/inscription', formData);
            setMessage('Inscription réussie. Vous pouvez vous connecter.');
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Erreur lors de l\'inscription.');
            setMessage('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Inscription</h2>
                {message && <p style={styles.success}>{message}</p>}
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    {/* Nom */}
                    <div style={styles.inputGroup}>
                        <label htmlFor="nom" style={styles.label}>Nom</label>
                        <div style={styles.inputWrapper}>
                            <FaUser style={styles.icon} />
                            <input
                                type="text"
                                name="nom"
                                id="nom"
                                value={formData.nom}
                                placeholder="Votre nom"
                                onChange={handleChange}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={styles.inputGroup}>
                        <label htmlFor="email" style={styles.label}>Email</label>
                        <div style={styles.inputWrapper}>
                            <FaEnvelope style={styles.icon} />
                            <input
                                type="email"
                                name="email"
                                id="email"
                                value={formData.email}
                                placeholder="Votre email"
                                onChange={handleChange}
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
                                name="mot_de_passe"
                                id="mot_de_passe"
                                value={formData.mot_de_passe}
                                placeholder="Votre mot de passe"
                                onChange={handleChange}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {/* Bouton d'Inscription */}
                    <div style={{ marginTop: 20 }}>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Inscription en cours...' : 'S\'inscrire'}
                        </button>
                    </div>
                </form>

                {/* Logos RIA et MoneyGram */}
                <div style={styles.logoSection}>
                    <p style={{ color: '#6b7280' }}>Compatible avec :</p>
                    <div style={styles.logoRow}>
                        <SiMoneygram size={30} color="#d60a2e" />
                        <SiWesternunion size={30} color="#ffcc00" />
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
    success: {
        backgroundColor: '#d1fae5',
        color: '#047857',
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
