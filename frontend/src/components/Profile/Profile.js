import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import { FaUserCircle, FaUser, FaEnvelope, FaIdBadge } from 'react-icons/fa';

export default function Profile() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token_acces');
            const res = await api.get('/utilisateur/profil', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data);
        } catch (error) {
            console.error("Erreur lors du chargement du profil :", error);
        }
    };

    if (!profile) {
        return (
            <div style={styles.loaderContainer}>
                <p style={styles.loader}>Chargement du profil...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconTitleContainer}>
                    <FaUserCircle size={48} color="#2563eb" />
                    <h2 style={styles.title}>Mon Profil</h2>
                </div>
                <div style={styles.detail}>
                    <FaUser style={styles.icon} />
                    <span style={styles.label}>Nom :</span> {profile.nom}
                </div>
                <div style={styles.detail}>
                    <FaEnvelope style={styles.icon} />
                    <span style={styles.label}>Email :</span> {profile.email}
                </div>
                <div style={styles.detail}>
                    <FaIdBadge style={styles.icon} />
                    <span style={styles.label}>Rôle :</span> {profile.role}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        padding: '20px',
    },
    card: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        maxWidth: '420px',
        width: '100%',
        animation: 'fadeIn 0.6s ease-in-out',
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginLeft: '10px',
        color: '#1f2937',
    },
    iconTitleContainer: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '25px',
        justifyContent: 'center',
    },
    detail: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '16px',
        color: '#374151',
        marginBottom: '16px',
    },
    label: {
        fontWeight: '600',
        color: '#111827',
        marginLeft: '8px',
        marginRight: '4px',
    },
    icon: {
        color: '#2563eb',
        marginRight: '10px',
        fontSize: '18px',
    },
    loaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        backgroundColor: '#f9fafb',
    },
    loader: {
        fontSize: '18px',
        color: '#4b5563',
    }
};
