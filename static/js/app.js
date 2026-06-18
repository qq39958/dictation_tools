// Main Vue application entry point
const { createApp, ref } = Vue;

const app = createApp({
    setup() {
        const currentView = ref('subjectManager');

        const startDictation = (subject) => {
            window.selectedSubject = subject;
            currentView.value = 'dictation';
        };

        return {
            currentView,
            startDictation
        };
    },
    components: {
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
        </div>
    `
});

app.mount('#app');
