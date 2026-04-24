const isProd = window.location.hostname !== 'localhost';

export const environment = {
  production: isProd,
  apiUrl: isProd
    ? 'https://collabboard-api-6spq.onrender.com/api'
    : 'http://localhost:3001/api',
  wsUrl: isProd
    ? 'https://collabboard-api-6spq.onrender.com'
    : 'http://localhost:3001',
};