import React from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import {
    FaSignInAlt, FaUserPlus, FaUser
} from 'react-icons/fa';

// Pages importées
import Login from './Auth/Login';
import Register from './Auth/Register';
import Profile from './Profile/Profile';
import Supervision from './Dashboard/Supervision';
import Alerts from './Dashboard/Alerts';
import TransactionList from './Transactions/TransactionList';
import TransactionCreate from './Transactions/TransactionCreate';
import TransactionStatusUpdate from './Transactions/TransactionStatusUpdate';
import TauxChangeList from './TauxChange/TauxChangeList';
import TauxChangeCreate from './TauxChange/TauxChangeCreate';

export default function Navigation() {
    const navStyle = {
        backgroundColor: '#1e3a8a',
        color: 'white',
        padding: '16px',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    };

    const navListStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '18px',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
    };

    const navItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'all 0.3s',
        cursor: 'pointer',
    };

    const navItemHover = {
        backgroundColor: '#2563eb',
    };

    const linkStyle = {
        color: 'white',
        textDecoration: 'none',
    };

    const contentStyle = {
        paddingTop: '100px',
        paddingLeft: '20px',
        paddingRight: '20px',
        flexGrow: 1,
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
    };

    return (
        <div className="flex flex-col h-screen">
            {/* NAVIGATION */}
            <nav style={navStyle}>
                <ul style={navListStyle}>
                    <li style={navItemStyle} onMouseOver={e => Object.assign(e.currentTarget.style, navItemHover)} onMouseOut={e => Object.assign(e.currentTarget.style, navItemStyle)}>
                        <FaSignInAlt />
                        <Link to="/login" style={linkStyle}>Connexion</Link>
                    </li>
                    <li style={navItemStyle} onMouseOver={e => Object.assign(e.currentTarget.style, navItemHover)} onMouseOut={e => Object.assign(e.currentTarget.style, navItemStyle)}>
                        <FaUserPlus />
                        <Link to="/register" style={linkStyle}>Inscription</Link>
                    </li>
                    <li style={navItemStyle} onMouseOver={e => Object.assign(e.currentTarget.style, navItemHover)} onMouseOut={e => Object.assign(e.currentTarget.style, navItemStyle)}>
                        <FaUser />
                        <Link to="/profile" style={linkStyle}>Mon Profil</Link>
                    </li>
                </ul>
            </nav>

            {/* CONTENU */}
            <div style={contentStyle}>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    {/* Les autres routes sont intactes et ne sont pas affectées */}
                    <Route path="/supervision" element={<Supervision />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/transactions" element={<TransactionList />} />
                    <Route path="/create-transaction" element={<TransactionCreate />} />
                    <Route path="/update-transaction" element={<TransactionStatusUpdate />} />
                    <Route path="/tauxchange" element={<TauxChangeList />} />
                    <Route path="/create-tauxchange" element={<TauxChangeCreate />} />
                </Routes>
            </div>
        </div>
    );
}
