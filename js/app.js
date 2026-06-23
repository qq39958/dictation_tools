// Main Vue application entry point
const { createApp, ref, onMounted, onUnmounted } = Vue;

const app = createApp({
    setup() {
        const currentView = ref('subjectManager');
        const loggedIn = ref(Api.isLoggedIn());
        const userEmail = ref(Api.getEmail());
        const showAuthModal = ref(false);

        const onLoggedIn = () => {
            loggedIn.value = true;
            userEmail.value = Api.getEmail();
            showAuthModal.value = false;
            // 通知 subject-manager 切换到云端数据
            window.dispatchEvent(new Event('dt:login'));
        };

        const logout = () => {
            Api.logout();
            loggedIn.value = false;
            userEmail.value = '';
            currentView.value = 'subjectManager';
            window.dispatchEvent(new Event('dt:logout'));
        };

        // 监听 token 过期自动登出事件
        const handleAutoLogout = () => logout();
        onMounted(() => window.addEventListener('dt:logout', handleAutoLogout));
        onUnmounted(() => window.removeEventListener('dt:logout', handleAutoLogout));

        const startDictation = (subject) => {
            window.selectedSubject = subject;
            currentView.value = 'dictation';
        };

        return {
            currentView,
            loggedIn,
            userEmail,
            showAuthModal,
            onLoggedIn,
            logout,
            startDictation
        };
    },
    components: {
        'auth': Auth,
        'subject-manager': SubjectManager,
        'dictation': Dictation
    },
    template: `
        <div id="app-shell">
            <header class="app-header">
                <div class="header-inner">
                    <div class="brand">
                        <span class="brand-zh">墨韵听写</span>
                        <span class="brand-en">Dictation Studio</span>
                    </div>
                    <nav class="app-nav">
                        <button
                            class="nav-tab"
                            :class="{ active: currentView === 'subjectManager' }"
                            @click="currentView = 'subjectManager'">
                            题目管理
                        </button>
                        <button
                            class="nav-tab"
                            :class="{ active: currentView === 'dictation' }"
                            @click="currentView = 'dictation'">
                            开始听写
                        </button>
                        <template v-if="loggedIn">
                            <span class="user-email">{{ userEmail }}</span>
                            <button class="nav-tab" @click="logout">退出</button>
                        </template>
                        <template v-else>
                            <button class="nav-tab" @click="showAuthModal = true">登录 / 注册</button>
                        </template>
                    </nav>
                </div>
            </header>

            <main class="app-main">
                <div v-if="currentView === 'subjectManager'" class="view-enter">
                    <div class="page-header">
                        <span class="page-header-label">Subject Library</span>
                        <h1 class="page-title">题目管理</h1>
                    </div>
                    <subject-manager @start-dictation="startDictation"></subject-manager>
                </div>

                <div v-if="currentView === 'dictation'" class="view-enter">
                    <div class="page-header">
                        <span class="page-header-label">Dictation Studio</span>
                        <h1 class="page-title">听写练习</h1>
                    </div>
                    <dictation></dictation>
                </div>
            </main>

            <!-- 登录弹窗 -->
            <div class="modal" v-if="showAuthModal">
                <div class="modal-content" style="max-width:420px; padding:32px;">
                    <span class="close" @click="showAuthModal = false">&times;</span>
                    <auth @logged-in="onLoggedIn"></auth>
                </div>
            </div>
        </div>
    `
});

app.mount('#app');
