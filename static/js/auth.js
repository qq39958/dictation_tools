// Auth Component - Login / Register
const Auth = {
    template: `
    <div class="auth-card">
        <div class="brand" style="text-align:center; margin-bottom:28px;">
            <span class="brand-zh" style="font-size:1.6rem;">墨韵听写</span>
        </div>

        <div class="auth-tabs">
            <button
                class="auth-tab"
                :class="{ active: mode === 'login' }"
                @click="mode = 'login'">登录</button>
            <button
                class="auth-tab"
                :class="{ active: mode === 'register' }"
                @click="mode = 'register'">注册</button>
        </div>

        <div class="form-group" style="margin-top:20px;">
            <label>邮箱</label>
            <input
                type="email"
                v-model="email"
                placeholder="请输入邮箱"
                @keyup.enter="submit"
                autocomplete="email"
            >
        </div>
        <div class="form-group">
            <label>密码</label>
            <input
                type="password"
                v-model="password"
                :placeholder="mode === 'register' ? '至少 6 位' : '请输入密码'"
                @keyup.enter="submit"
                autocomplete="current-password"
            >
        </div>

        <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>

        <button
            class="btn btn-primary"
            style="width:100%; margin-top:8px;"
            :disabled="loading"
            @click="submit">
            {{ loading ? '请稍候…' : (mode === 'login' ? '登录' : '注册') }}
        </button>
    </div>
    `,
    data() {
        return {
            mode: 'login',
            email: '',
            password: '',
            errorMsg: '',
            loading: false,
        };
    },
    methods: {
        async submit() {
            this.errorMsg = '';
            if (!this.email || !this.password) {
                this.errorMsg = '邮箱和密码不能为空';
                return;
            }
            this.loading = true;
            try {
                if (this.mode === 'login') {
                    await Api.login(this.email, this.password);
                } else {
                    await Api.register(this.email, this.password);
                }
                this.$emit('logged-in');
            } catch (e) {
                this.errorMsg = e.message;
            } finally {
                this.loading = false;
            }
        },
    },
};
