// Main Vue application entry point
const { createApp, ref, onMounted, onUnmounted } = Vue;

const app = createApp({
    setup() {
        const currentView = ref('subjectManager');
        const loggedIn = ref(Api.isLoggedIn());
        const userEmail = ref(Api.getEmail());

        const onLoggedIn = () => {
            loggedIn.value = true;
            userEmail.value = Api.getEmail();
        };

        const logout = () => {
            Api.logout();
            loggedIn.value = false;
            userEmail.value = '';
            currentView.value = 'subjectManager';
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
            <!-- 未登录显示登录页 -->
            <auth v-if="!loggedIn" @logged-in="onLoggedIn"></auth>

            <!-- 已登录显示主界面 -->
            <template v-else>
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
                            <span class="user-email">{{ userEmail }}</span>
                            <button class="nav-tab" @click="logout">退出</button>
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
            </template>
        </div>
    `
});

app.mount('#app');
