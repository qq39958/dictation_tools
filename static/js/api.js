// API client for Dictation Tools
const API_BASE = 'https://dictationtools-api.3995854560.workers.dev';

const Api = {
    // ── Auth ──────────────────────────────────────────────────────────────────

    getToken() {
        return localStorage.getItem('dt_token');
    },

    setToken(token) {
        localStorage.setItem('dt_token', token);
    },

    clearToken() {
        localStorage.removeItem('dt_token');
        localStorage.removeItem('dt_email');
    },

    getEmail() {
        return localStorage.getItem('dt_email');
    },

    setEmail(email) {
        localStorage.setItem('dt_email', email);
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    async request(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();
        if (!res.ok) {
            // token 过期或无效时自动登出
            if (res.status === 401) {
                this.clearToken();
                window.dispatchEvent(new Event('dt:logout'));
            }
            throw new Error(data.error || '请求失败');
        }
        return data;
    },

    // ── Auth API ──────────────────────────────────────────────────────────────

    async register(email, password) {
        const data = await this.request('POST', '/api/register', { email, password });
        this.setToken(data.token);
        this.setEmail(data.email);
        return data;
    },

    async login(email, password) {
        const data = await this.request('POST', '/api/login', { email, password });
        this.setToken(data.token);
        this.setEmail(data.email);
        return data;
    },

    logout() {
        this.clearToken();
    },

    // ── Subjects API ──────────────────────────────────────────────────────────

    async getSubjects() {
        return await this.request('GET', '/api/subjects');
    },

    async createSubject(subject_name, subject_dir, subject_content) {
        return await this.request('POST', '/api/subjects', { subject_name, subject_dir, subject_content });
    },

    async updateSubject(id, subject_content) {
        return await this.request('PUT', `/api/subjects/${id}`, { subject_content });
    },

    async deleteSubject(id) {
        return await this.request('DELETE', `/api/subjects/${id}`);
    },

    // ── Dirs API ──────────────────────────────────────────────────────────────

    async getDirs() {
        return await this.request('GET', '/api/dirs');
    },

    async createDir(name) {
        return await this.request('POST', '/api/dirs', { name });
    },

    async deleteDir(name) {
        return await this.request('DELETE', `/api/dirs/${encodeURIComponent(name)}`);
    },
};
