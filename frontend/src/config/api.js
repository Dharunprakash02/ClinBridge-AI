// Dynamically resolve backend API address based on browser host
// Enables seamless cross-device LAN access (mobile, tablet, desktop)
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
};

export const API_BASE = getApiBase();
export default API_BASE;

