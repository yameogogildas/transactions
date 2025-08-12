import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000', // Change si backend sur un autre port
});

// Ajouter le token si disponible
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export default API;
