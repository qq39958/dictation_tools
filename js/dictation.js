// Dictation Component
const Dictation = {
    template: `
    <div class="dictation-container">
        <!-- Left Panel: Settings -->
        <div class="dictation-panel">
            <div class="settings-panel-head">
                <span>听写设置</span>
            </div>
            <div class="settings-panel-body">
                <div class="form-group">
                    <label>听写模式</label>
                    <select v-model="dictationMode">
                        <option value="direct">直接听写</option>
                        <option value="hint">提示听写</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>选择题目目录</label>
                    <select v-model="selectedDir" @change="loadSubjectsForDir">
                        <option value="">请选择目录</option>
                        <option v-for="dir in directories" :key="dir" :value="dir">{{ dir }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>选择题目 <span style="color:var(--text3);font-weight:400">（可多选）</span></label>
                    <!-- PC: 原生 select multiple -->
                    <template v-if="!isTouch">
                        <select multiple v-model="selectedSubjectNames" @change="onSubjectMultiSelect" class="subject-multi-select">
                            <option v-for="subject in subjectsInDir" :key="subject.subject_name" :value="subject.subject_name">{{ subject.subject_name }}</option>
                        </select>
                        <div style="margin-top:4px;font-size:0.7rem;color:var(--text3)">按住 Cmd/Ctrl 可多选</div>
                    </template>
                    <!-- iPad: checkbox 列表 -->
                    <template v-else>
                        <div class="subject-checkbox-list">
                            <label
                                v-for="subject in subjectsInDir"
                                :key="subject.subject_name"
                                class="subject-checkbox-item"
                            >
                                <input
                                    type="checkbox"
                                    :value="subject.subject_name"
                                    v-model="selectedSubjectNames"
                                    @change="onSubjectMultiSelect"
                                >
                                <span>{{ subject.subject_name }}</span>
                            </label>
                        </div>
                        <div style="margin-top:4px;font-size:0.7rem;color:var(--text3)">点击勾选，可多选</div>
                    </template>
                </div>

                <!-- 多选时的拖拽排序编排区 -->
                <div class="form-group" v-if="selectedSubjectNames.length > 1">
                    <label>编排顺序 <span style="color:var(--text3);font-weight:400">（{{ isTouch ? '长按拖动' : '拖拽调整' }}）</span></label>
                    <div class="subject-arrange-list">
                        <div
                            v-for="(name, idx) in arrangedSubjectNames"
                            :key="name"
                            class="subject-arrange-item"
                            :draggable="!isTouch"
                            @dragstart="!isTouch && onArrangeDragStart(idx, $event)"
                            @dragover.prevent="!isTouch && onArrangeDragOver(idx, $event)"
                            @drop="!isTouch && onArrangeDrop(idx)"
                            @dragend="!isTouch && onArrangeDragEnd()"
                            @touchstart.passive="isTouch && onTouchDragStart(idx, $event)"
                            @touchmove.prevent="isTouch && onTouchDragMove($event)"
                            @touchend="isTouch && onTouchDragEnd($event)"
                            :class="{ 'drag-over': arrangeDragOverIdx === idx, 'dragging': arrangeDraggingIdx === idx }"
                        >
                            <span class="arrange-handle">⠿</span>
                            <span class="arrange-index">{{ idx + 1 }}</span>
                            <span class="arrange-name">{{ name }}</span>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>题目内容</label>
                    <textarea v-model="subjectContent" placeholder="选择题目或手动输入，每行一个词语或句子"></textarea>
                </div>

                <div class="settings-divider"></div>

                <div class="form-group">
                    <label>暂停规则</label>
                    <select v-model="pauseRule">
                        <option value="fixed">固定时间</option>
                        <option value="words">按字个数</option>
                        <option value="everytime">每次暂停</option>
                    </select>
                </div>

                <div class="form-group" v-if="pauseRule === 'fixed'">
                    <label>每行暂停时间（秒）</label>
                    <input type="number" v-model.number="fixedPauseTime" min="0" step="0.1">
                </div>

                <div class="form-group" v-if="pauseRule === 'words'">
                    <label>字数倍数（秒）</label>
                    <input type="number" v-model.number="wordsPauseMultiplier" min="0" step="0.1">
                </div>

                <div class="form-group">
                    <label>抽查比例 (%)</label>
                    <input type="number" v-model.number="samplingPercentage" min="1" max="100" placeholder="默认 100%">
                    <div class="sampling-actions">
                        <button class="btn btn-secondary btn-sm" @click="sequentialSampling">顺序采样</button>
                        <button class="btn btn-secondary btn-sm" @click="randomSampling">打乱采样</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Panel: Preview + Display + Controls -->
        <div class="dictation-panel">
            <!-- Preview section -->
            <div class="preview-section">
                <div class="panel-head">
                    <span class="panel-head-title">听写预览</span>
                    <div class="panel-head-actions">
                        <button class="copy-button btn" @click="copyPreviewContent" title="复制内容">复制</button>
                        <button class="btn" @click="selectAllLines">全选</button>
                        <button class="btn" @click="deselectAllLines">取消</button>
                        <button class="btn btn-success" @click="saveSelectedLines">保存选中</button>
                        <button class="btn" @click="togglePreviewFullscreen">{{ isPreviewFullscreen ? '退出全屏' : '全屏预览' }}</button>
                    </div>
                </div>
                <div class="preview-area" :class="{ 'preview-fullscreen': isPreviewFullscreen }">
                    <div v-for="(item, index) in previewItems" :key="index" class="preview-item">
                        <span class="line-number">{{ index + 1 }}.</span>
                        <span class="line-content">{{ item }}</span>
                        <input
                            type="checkbox"
                            :checked="selectedPreviewLines[index]"
                            @change="toggleLineSelection(index)"
                            class="line-checkbox"
                            title="选择此行">
                    </div>
                </div>
            </div>

            <!-- Display section -->
            <div class="display-area" :class="{ active: currentItemIndex >= 0 && currentItemIndex < dictationItems.length, 'fullscreen': isFullscreen, 'paused': isPaused, 'is-touch': isTouch }"
                @click="isTouch && isFullscreen && isRunning && onDisplayTap()">
                <div v-if="currentItemIndex >= 0 && currentItemIndex < dictationItems.length">
                    <div v-html="getCurrentDisplayText()"></div>
                </div>
                <div v-else-if="isCompleted">
                    <div v-html="getCurrentDisplayText()"></div>
                </div>
                <div v-else>
                    请先设置并开始听写
                </div>
                <div v-if="isPaused && currentItemIndex >= 0 && currentItemIndex < dictationItems.length" class="pause-overlay">
                    <div class="pause-text">已暂停</div>
                    <div v-if="isTouch && isFullscreen" class="pause-tap-hint">点击继续</div>
                </div>
                <div v-if="isCompleted" class="completion-overlay">
                    <div class="completion-text">文件已读完</div>
                </div>
            </div>

            <!-- Progress bar -->
            <div class="progress-bar" v-if="dictationItems.length > 0">
                <div class="progress-fill" :style="{ width: currentItemIndex >= 0 ? ((currentItemIndex / dictationItems.length) * 100) + '%' : '0%' }"></div>
            </div>

            <!-- Controls -->
            <div class="control-area">
                <button
                    class="btn btn-primary control-btn"
                    @click="startDictation"
                    :disabled="isRunning"
                    v-if="!isRunning">
                    开始听写
                </button>

                <button
                    class="btn control-btn"
                    @click="pauseDictation"
                    v-if="isRunning && !isPaused">
                    暂停
                </button>

                <button
                    class="btn btn-success control-btn"
                    @click="resumeDictation"
                    v-if="isRunning && isPaused">
                    继续
                </button>

                <button
                    class="btn btn-danger control-btn"
                    @click="stopDictation">
                    停止
                </button>

                <button
                    class="btn btn-secondary control-btn"
                    @click="toggleFullscreen">
                    {{ isFullscreen ? '退出全屏' : '全屏模式' }}
                </button>

                <div v-if="isRunning" class="nav-btns">
                    <button class="btn btn-secondary control-btn" @click="prevItem">&#8592; 上一个</button>
                    <button class="btn btn-secondary control-btn" @click="nextItem">下一个 &#8594;</button>
                </div>

                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-lt); display: flex; align-items: center; gap: 8px; justify-content: center;">
                    <label style="font-size:0.78rem; color:var(--ink-light); letter-spacing:0.04em;">从第几行开始</label>
                    <input
                        type="number"
                        v-model.number="startFromLine"
                        min="1"
                        :max="dictationItems.length"
                        :disabled="isRunning"
                        style="width:65px; padding:5px 8px; font-family:var(--font-serif); font-size:0.85rem; background:var(--parchment); border:1px solid var(--border); outline:none; text-align:center; border-radius:0; -webkit-appearance:none; appearance:none;">
                    <button class="btn btn-secondary btn-sm" @click="jumpToLine" :disabled="isRunning">跳转</button>
                </div>
            </div>
        </div>

        <!-- Save Selected Lines Modal -->
        <div class="modal modal-edit" v-if="showSaveSelectedModal">
            <div class="modal-content">
                <span class="close" @click="closeSaveSelectedModal">&times;</span>
                <h3>保存选中行</h3>
                <div class="form-group">
                    <label>题目名称</label>
                    <input type="text" v-model="saveSelectedName" placeholder="仅允许字母、数字、_、-.">
                </div>
                <div class="form-group">
                    <label>题目目录</label>
                    <select v-model="saveSelectedDir">
                        <option v-for="dir in directories" :key="dir" :value="dir">{{ dir }}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>题目内容</label>
                    <textarea v-model="saveSelectedContent" readonly></textarea>
                </div>
                <div class="form-group" style="display:flex; gap:8px;">
                    <button class="btn btn-primary" @click="confirmSaveSelectedLines">保存</button>
                    <button class="btn btn-secondary" @click="closeSaveSelectedModal">取消</button>
                </div>
            </div>
        </div>

        <!-- 提示弹窗 -->
        <div class="modal modal-edit" v-if="showSuccessMessage" @click.self="closeSuccessMessage">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <p style="color:var(--ink-mid); line-height:1.7; padding:12px 0 20px;">{{ successMessage }}</p>
                <button class="btn btn-primary" @click="closeSuccessMessage">确定</button>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            isTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
            dictationMode: 'direct',
            selectedDir: '',
            selectedSubjectName: '',
            selectedSubjectNames: [],
            arrangedSubjectNames: [],
            arrangeDraggingIdx: -1,
            arrangeDragOverIdx: -1,
            touchDraggingIdx: -1,
            touchDragTargetIdx: -1,
            touchDragNode: null,
            touchDragClone: null,
            subjectContent: '',
            pauseRule: 'fixed',
            fixedPauseTime: 2,
            wordsPauseMultiplier: 7,
            samplingPercentage: 100,
            directories: [],
            subjectsInDir: [],
            previewItems: [],
            dictationItems: [],
            currentItemIndex: -1,
            isRunning: false,
            isPaused: false,
            isCompleted: false,
            selectedPreviewLines: [],
            timer: null,
            countdownInterval: null,
            pauseCountdown: 0,
            startFromLine: 1,
            isFullscreen: false,
            isPreviewFullscreen: false,
            handleKeyDown: null,
            showSaveSelectedModal: false,
            saveSelectedName: '',
            saveSelectedDir: '',
            saveSelectedContent: '',
            showSuccessMessage: false,
            successMessage: ''
        };
    },
    mounted() {
        this.loadDirectories();
        this._onLogin = () => this.loadDirectories();
        this._onLogout = () => this.loadDirectories();
        window.addEventListener('dt:login', this._onLogin);
        window.addEventListener('dt:logout', this._onLogout);
        if (window.selectedSubject) {
            const s = window.selectedSubject;
            this.selectedDir = s.subject_dir;
            this.loadSubjectsForDir();
            this.selectedSubjectName = s.subject_name;
            this.selectedSubjectNames = [s.subject_name];
            this.arrangedSubjectNames = [s.subject_name];
            this.subjectContent = s.subject_content;
            window.selectedSubject = null;
        }
        this.updatePreview();
        if (!this.isTouch) {
            this.setupKeyboardControls();
        }
        document.addEventListener('fullscreenchange', this.handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
        document.addEventListener('fullscreenchange', this.handlePreviewFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.handlePreviewFullscreenChange);
        document.addEventListener('mozfullscreenchange', this.handlePreviewFullscreenChange);
        document.addEventListener('MSFullscreenChange', this.handlePreviewFullscreenChange);
    },
    beforeUnmount() {
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
        document.removeEventListener('fullscreenchange', this.handlePreviewFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.handlePreviewFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this.handlePreviewFullscreenChange);
        document.removeEventListener('MSFullscreenChange', this.handlePreviewFullscreenChange);
        window.removeEventListener('dt:login', this._onLogin);
        window.removeEventListener('dt:logout', this._onLogout);
    },
    watch: {
        subjectContent() {
            this.updatePreview();
        },
        samplingPercentage() {
            if (this.samplingPercentage < 1) this.samplingPercentage = 1;
            if (this.samplingPercentage > 100) this.samplingPercentage = 100;
        }
    },
    methods: {
        async retryRequest(fn, retries = 3, delay = 1000) {
            for (let i = 0; i < retries; i++) {
                try {
                    return await fn();
                } catch (e) {
                    if (i < retries - 1) {
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        throw e;
                    }
                }
            }
        },

        async loadDirectories() {
            if (Api.isLoggedIn()) {
                try {
                    this.directories = await this.retryRequest(() => Api.getDirs());
                } catch (e) {
                    alert('加载目录失败，请检查网络状态');
                }
            } else {
                const data = localStorage.getItem('dictation_dirs');
                this.directories = data ? JSON.parse(data) : [];
            }
        },

        async loadSubjectsForDir() {
            if (!this.selectedDir) {
                this.subjectsInDir = [];
                return;
            }
            if (Api.isLoggedIn()) {
                try {
                    const allSubjects = await this.retryRequest(() => Api.getSubjects());
                    this.subjectsInDir = allSubjects.filter(s => s.subject_dir === this.selectedDir);
                } catch (e) {
                    alert('加载题目失败，请检查网络状态');
                    this.subjectsInDir = [];
                }
            } else {
                const data = localStorage.getItem('dictation_subjects');
                const subjects = data ? JSON.parse(data) : [];
                this.subjectsInDir = subjects.filter(s => s.subject_dir === this.selectedDir);
            }
            this.selectedSubjectNames = [];
            this.arrangedSubjectNames = [];
        },

        loadSubjectContent() {
            if (!this.selectedDir || !this.selectedSubjectName) {
                return;
            }
            const subject = this.subjectsInDir.find(s => s.subject_name === this.selectedSubjectName);
            if (subject) {
                this.subjectContent = subject.subject_content;
            }
        },

        onSubjectMultiSelect() {
            const names = this.selectedSubjectNames;
            if (names.length === 0) {
                this.arrangedSubjectNames = [];
                this.subjectContent = '';
                return;
            }
            // 保留已有排列顺序中仍被选中的，新增的追加到末尾
            const kept = this.arrangedSubjectNames.filter(n => names.includes(n));
            const added = names.filter(n => !kept.includes(n));
            this.arrangedSubjectNames = [...kept, ...added];
            this.mergeSubjectContents();
        },

        mergeSubjectContents() {
            const data = localStorage.getItem('dictation_subjects');
            const subjects = data ? JSON.parse(data) : [];
            const contents = this.arrangedSubjectNames.map(name => {
                const s = subjects.find(s => s.subject_name === name && s.subject_dir === this.selectedDir);
                return s ? s.subject_content.trim() : '';
            }).filter(c => c !== '');
            this.subjectContent = contents.join('\n');
        },

        onArrangeDragStart(idx, e) {
            this.arrangeDraggingIdx = idx;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', idx);
            }
        },

        onArrangeDragOver(idx) {
            this.arrangeDragOverIdx = idx;
        },

        onArrangeDrop(targetIdx) {
            const fromIdx = this.arrangeDraggingIdx;
            if (fromIdx === -1 || fromIdx === targetIdx) return;
            const arr = [...this.arrangedSubjectNames];
            const [moved] = arr.splice(fromIdx, 1);
            arr.splice(targetIdx, 0, moved);
            this.arrangedSubjectNames = arr;
            this.mergeSubjectContents();
        },

        onArrangeDragEnd() {
            this.arrangeDraggingIdx = -1;
            this.arrangeDragOverIdx = -1;
        },

        updatePreview() {
            const lines = this.subjectContent.split('\n').filter(line => line.trim() !== '');
            if (this.samplingPercentage < 100) {
                this.previewItems = this.applySamplingToLines(lines);
            } else {
                this.previewItems = [...lines];
            }
            this.selectedPreviewLines = new Array(this.previewItems.length).fill(true);
            this.dictationItems = [...this.previewItems];
            this.currentItemIndex = -1;
        },

        applySamplingToLines(lines) {
            if (this.samplingPercentage >= 100) {
                return [...lines];
            }
            const count = Math.max(1, Math.floor(lines.length * this.samplingPercentage / 100));
            const indices = [];
            for (let i = 0; i < lines.length; i++) indices.push(i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            return indices.slice(0, count).sort((a, b) => a - b).map(i => lines[i]);
        },

        sequentialSampling() {
            if (!this.subjectContent) {
                alert('请先输入题目内容');
                return;
            }
            const lines = this.subjectContent.split('\n').filter(line => line.trim() !== '');
            if (this.samplingPercentage >= 100) {
                this.previewItems = [...lines];
            } else {
                const count = Math.max(1, Math.floor(lines.length * this.samplingPercentage / 100));
                const indices = [];
                for (let i = 0; i < lines.length; i++) indices.push(i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                this.previewItems = indices.slice(0, count).sort((a, b) => a - b).map(i => lines[i]);
            }
            this.selectedPreviewLines = new Array(this.previewItems.length).fill(true);
            this.dictationItems = [...this.previewItems];
            this.currentItemIndex = -1;
        },

        randomSampling() {
            if (!this.subjectContent) {
                alert('请先输入题目内容');
                return;
            }
            const lines = this.subjectContent.split('\n').filter(line => line.trim() !== '');
            if (this.samplingPercentage >= 100) {
                this.previewItems = [...lines];
                for (let i = this.previewItems.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.previewItems[i], this.previewItems[j]] = [this.previewItems[j], this.previewItems[i]];
                }
            } else {
                const count = Math.max(1, Math.floor(lines.length * this.samplingPercentage / 100));
                const indices = [];
                for (let i = 0; i < lines.length; i++) indices.push(i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                this.previewItems = indices.slice(0, count).map(i => lines[i]);
            }
            this.selectedPreviewLines = new Array(this.previewItems.length).fill(true);
            this.dictationItems = [...this.previewItems];
            this.currentItemIndex = -1;
        },

        toggleLineSelection(index) {
            this.selectedPreviewLines[index] = !this.selectedPreviewLines[index];
        },

        selectAllLines() {
            this.selectedPreviewLines = new Array(this.previewItems.length).fill(true);
        },

        deselectAllLines() {
            this.selectedPreviewLines = new Array(this.previewItems.length).fill(false);
        },

        togglePreviewFullscreen() {
            const previewArea = document.querySelector('.preview-area');
            if (!this.isPreviewFullscreen) {
                if (previewArea) {
                    if (previewArea.requestFullscreen) {
                        previewArea.requestFullscreen();
                    } else if (previewArea.webkitRequestFullscreen) {
                        previewArea.webkitRequestFullscreen();
                    } else if (previewArea.mozRequestFullScreen) {
                        previewArea.mozRequestFullScreen();
                    } else if (previewArea.msRequestFullscreen) {
                        previewArea.msRequestFullscreen();
                    } else {
                        previewArea.classList.add('preview-fullscreen');
                        this.isPreviewFullscreen = true;
                    }
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else {
                    if (previewArea) previewArea.classList.remove('preview-fullscreen');
                    this.isPreviewFullscreen = false;
                }
            }
        },

        saveSelectedLines() {
            const selectedLines = this.previewItems.filter((item, index) => this.selectedPreviewLines[index] === true);
            if (selectedLines.length === 0) {
                this.successMessage = '请至少选择一行内容';
                this.showSuccessMessage = true;
                return;
            }
            this.showSaveSelectedModal = true;
            this.saveSelectedContent = selectedLines.join('\n');
            this.saveSelectedName = '';
            this.saveSelectedDir = this.directories.length > 0 ? this.directories[0] : '';
        },

        closeSaveSelectedModal() {
            this.showSaveSelectedModal = false;
            this.saveSelectedName = '';
            this.saveSelectedDir = '';
            this.saveSelectedContent = '';
        },

        confirmSaveSelectedLines() {
            if (!this.saveSelectedName.trim()) {
                this.successMessage = '题目名称不能为空';
                this.showSuccessMessage = true;
                return;
            }
            if (!/^[a-zA-Z0-9_.-]+$/.test(this.saveSelectedName)) {
                this.successMessage = '题目名称格式不正确，只允许字母、数字、_、-、.';
                this.showSuccessMessage = true;
                return;
            }
            if (!this.saveSelectedDir) {
                this.successMessage = '请选择目录';
                this.showSuccessMessage = true;
                return;
            }
            const data = localStorage.getItem('dictation_subjects');
            const subjects = data ? JSON.parse(data) : [];
            const exists = subjects.some(s =>
                s.subject_name === this.saveSelectedName && s.subject_dir === this.saveSelectedDir
            );
            if (exists) {
                this.successMessage = `题目 ${this.saveSelectedName} 在目录 ${this.saveSelectedDir} 中已存在`;
                this.showSuccessMessage = true;
                return;
            }
            subjects.unshift({
                subject_name: this.saveSelectedName,
                subject_dir: this.saveSelectedDir,
                subject_content: this.saveSelectedContent,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('dictation_subjects', JSON.stringify(subjects));
            this.successMessage = '保存成功';
            this.showSuccessMessage = true;
            this.closeSaveSelectedModal();
        },

        closeSuccessMessage() {
            this.showSuccessMessage = false;
            this.successMessage = '';
        },

        copyPreviewContent() {
            const content = this.previewItems.join('\n');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(content).then(() => {
                    this.showCopyFeedback();
                }).catch(() => {
                    this.fallbackCopy(content);
                });
            } else {
                this.fallbackCopy(content);
            }
        },

        fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                this.showCopyFeedback();
            } catch (err) {
                console.error('Unable to copy', err);
            }
            document.body.removeChild(textArea);
        },

        showCopyFeedback() {
            const feedback = document.createElement('div');
            feedback.textContent = '已复制!';
            feedback.style.cssText = `
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: #0ea5e9; color: white;
                padding: 10px 20px; border-radius: 4px;
                z-index: 10000; font-size: 14px; pointer-events: none;
            `;
            document.body.appendChild(feedback);
            setTimeout(() => document.body.removeChild(feedback), 2000);
        },

        toggleFullscreen() {
            const displayArea = document.querySelector('.display-area');
            if (!this.isFullscreen) {
                if (displayArea.requestFullscreen) displayArea.requestFullscreen();
                else if (displayArea.webkitRequestFullscreen) displayArea.webkitRequestFullscreen();
                else if (displayArea.mozRequestFullScreen) displayArea.mozRequestFullScreen();
                else if (displayArea.msRequestFullscreen) displayArea.msRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
                else if (document.msExitFullscreen) document.msExitFullscreen();
            }
        },

        setupKeyboardControls() {
            this.handleKeyDown = (event) => {
                if (event.code === 'Space' && this.isFullscreen && this.isRunning) {
                    event.preventDefault();
                    if (this.isPaused) this.resumeDictation();
                    else this.pauseDictation();
                }
                if (event.code === 'Escape' && this.isFullscreen) {
                    this.toggleFullscreen();
                }
            };
            document.addEventListener('keydown', this.handleKeyDown);
        },

        handleFullscreenChange() {
            this.isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);
        },

        handlePreviewFullscreenChange() {
            const previewArea = document.querySelector('.preview-area');
            this.isPreviewFullscreen = !!(
                document.fullscreenElement === previewArea ||
                document.webkitFullscreenElement === previewArea ||
                document.mozFullScreenElement === previewArea ||
                document.msFullscreenElement === previewArea
            );
        },

        startDictation() {
            const selectedDictationItems = this.previewItems.filter(
                (item, index) => this.selectedPreviewLines[index] === true
            );
            if (selectedDictationItems.length === 0) {
                this.successMessage = '没有可听写的内容，请先设置题目内容并选择要听写的行';
                this.showSuccessMessage = true;
                return;
            }
            this.dictationItems = selectedDictationItems;
            this.isRunning = true;
            this.isPaused = false;
            this.isCompleted = false;
            this.currentItemIndex = this.startFromLine - 1;
            if (this.currentItemIndex >= this.dictationItems.length) {
                this.currentItemIndex = 0;
            }
            this.processNextItem();
        },

        pauseDictation() {
            this.isPaused = true;
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        },

        resumeDictation() {
            this.isPaused = false;
            if (this.isRunning) {
                if (this.currentItemIndex >= this.dictationItems.length) {
                    this.stopDictation();
                    this.showCompletionOverlay();
                } else {
                    this.processNextItem();
                }
            }
        },

        stopDictation() {
            this.isRunning = false;
            this.isPaused = false;
            this.isCompleted = false;
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            this.pauseCountdown = 0;
            this.currentItemIndex = -1;
        },

        prevItem() {
            if (!this.isRunning) return;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
            this.isPaused = false;
            this.currentItemIndex = Math.max(0, this.currentItemIndex - 1);
            this.processNextItem();
        },

        nextItem() {
            if (!this.isRunning) return;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
            this.isPaused = false;
            this.currentItemIndex++;
            this.processNextItem();
        },

        processNextItem() {
            if (!this.isRunning || this.isPaused) return;

            if (this.currentItemIndex >= this.dictationItems.length) {
                this.stopDictation();
                this.showCompletionOverlay();
                return;
            }

            let itemToRead = this.dictationItems[this.currentItemIndex];
            let itemForPauseCalculation = itemToRead;

            if (this.dictationMode === 'hint' && itemToRead.includes('#')) {
                const parts = itemToRead.split('#', 2);
                if (parts.length > 1) {
                    itemToRead = parts[1].trim();
                    itemForPauseCalculation = parts[0].trim();
                } else {
                    itemToRead = '';
                    itemForPauseCalculation = parts[0].trim();
                }
            } else if (this.dictationMode === 'direct') {
                itemToRead = itemToRead.trim();
                itemForPauseCalculation = itemToRead;
            }

            if (this.pauseRule === 'everytime') {
                this.speakText(itemToRead, true);
                setTimeout(() => {
                    this.speakText(itemToRead, false);
                    setTimeout(() => {
                        this.currentItemIndex++;
                        this.isPaused = true;
                    }, 1000);
                }, 2000);
                return;
            }

            let delay = 1000;
            if (this.pauseRule === 'fixed') {
                delay = this.fixedPauseTime * 1000;
            } else if (this.pauseRule === 'words') {
                const text = itemForPauseCalculation;
                let count = 0;
                const chineseChars = text.match(/[\u4e00-\u9fff]/g);
                const englishWords = text.match(/[a-zA-Z]+/g);
                if (chineseChars) count += chineseChars.length;
                if (englishWords) count += englishWords.length;
                delay = count * this.wordsPauseMultiplier * 1000;
            }

            this.speakText(itemToRead, true);
            setTimeout(() => {
                this.speakText(itemToRead, false);
                if (this.countdownInterval) clearInterval(this.countdownInterval);
                this.pauseCountdown = Math.ceil(delay / 1000);
                this.countdownInterval = setInterval(() => {
                    if (this.pauseCountdown > 0) this.pauseCountdown--;
                }, 1000);
                this.timer = setTimeout(() => {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                    this.currentItemIndex++;
                    this.processNextItem();
                }, delay);
            }, 2000);
        },

        speakText(text, shouldCancel = true) {
            if ('speechSynthesis' in window) {
                if (shouldCancel) speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                const voices = speechSynthesis.getVoices();
                const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cn'));
                if (chineseVoice) utterance.voice = chineseVoice;
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = 1;
                speechSynthesis.speak(utterance);
            } else {
                console.warn('Web Speech API is not supported in this browser');
            }
        },

        showCompletionOverlay() {
            this.speakText('文件已读完', true);
            setTimeout(() => {
                this.speakText('文件已读完', false);
            }, 2000);
            this.isCompleted = true;
            setTimeout(() => {
                this.isCompleted = false;
            }, 5000);
        },

        jumpToLine() {
            if (this.startFromLine < 1) this.startFromLine = 1;
            else if (this.startFromLine > this.dictationItems.length) this.startFromLine = this.dictationItems.length;
            this.currentItemIndex = this.startFromLine - 1;
        },

        getCurrentDisplayText() {
            if (this.isCompleted) return '';
            if (this.currentItemIndex < 0 || this.currentItemIndex >= this.dictationItems.length) {
                return '请先设置并开始听写';
            }

            const currentItem = this.dictationItems[this.currentItemIndex];
            let displayText = currentItem;
            let itemForPauseCalculation = currentItem;

            if (this.dictationMode === 'hint' && currentItem.includes('#')) {
                const parts = currentItem.split('#', 2);
                if (parts.length > 1) {
                    displayText = parts[1].trim();
                    itemForPauseCalculation = parts[0].trim();
                } else {
                    displayText = '';
                    itemForPauseCalculation = parts[0].trim();
                }
            } else if (this.dictationMode === 'direct') {
                displayText = currentItem.trim();
                itemForPauseCalculation = currentItem;
            }

            if (this.pauseRule === 'everytime') {
                return `第${this.currentItemIndex + 1}行：${displayText}<br><span class="pause-info">等待手动继续</span>`;
            }

            let pauseTime = 0;
            if (this.pauseRule === 'fixed') {
                pauseTime = this.fixedPauseTime;
            } else if (this.pauseRule === 'words') {
                const text = itemForPauseCalculation;
                let count = 0;
                const chineseChars = text.match(/[\u4e00-\u9fff]/g);
                const englishWords = text.match(/[a-zA-Z]+/g);
                if (chineseChars) count += chineseChars.length;
                if (englishWords) count += englishWords.length;
                pauseTime = count * this.wordsPauseMultiplier;
            }

            return `第${this.currentItemIndex + 1}行：${displayText}<br><span class="pause-info">暂停${this.pauseCountdown}秒</span>`;
        },

        onDisplayTap() {
            if (this.isPaused) {
                this.resumeDictation();
            } else {
                this.pauseDictation();
            }
        },

        onTouchDragStart(idx, e) {
            this.touchDraggingIdx = idx;
            this.arrangeDraggingIdx = idx;
            this.touchDragTargetIdx = idx;
            const touch = e.touches[0];
            const clone = e.currentTarget.cloneNode(true);
            clone.style.cssText = `
                position:fixed; opacity:0.85; pointer-events:none; z-index:9999;
                background:var(--surface2); border:1px solid var(--accent);
                border-radius:var(--r-sm); width:${e.currentTarget.offsetWidth}px;
                left:${touch.clientX - e.currentTarget.offsetWidth / 2}px;
                top:${touch.clientY - 20}px; box-shadow:var(--shadow-md);
            `;
            document.body.appendChild(clone);
            this.touchDragClone = clone;
        },

        onTouchDragMove(e) {
            if (this.touchDraggingIdx === -1 || !this.touchDragClone) return;
            const touch = e.touches[0];
            this.touchDragClone.style.left = `${touch.clientX - this.touchDragClone.offsetWidth / 2}px`;
            this.touchDragClone.style.top = `${touch.clientY - 20}px`;
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const item = el && el.closest('.subject-arrange-item');
            if (item) {
                const list = document.querySelector('.subject-arrange-list');
                const items = list ? list.querySelectorAll('.subject-arrange-item') : [];
                items.forEach((node, i) => {
                    if (node === item) this.touchDragTargetIdx = i;
                });
                this.arrangeDragOverIdx = this.touchDragTargetIdx;
            }
        },

        onTouchDragEnd() {
            if (this.touchDragClone) {
                document.body.removeChild(this.touchDragClone);
                this.touchDragClone = null;
            }
            const fromIdx = this.touchDraggingIdx;
            const toIdx = this.touchDragTargetIdx;
            if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                const arr = [...this.arrangedSubjectNames];
                const [moved] = arr.splice(fromIdx, 1);
                arr.splice(toIdx, 0, moved);
                this.arrangedSubjectNames = arr;
                this.mergeSubjectContents();
            }
            this.touchDraggingIdx = -1;
            this.touchDragTargetIdx = -1;
            this.touchDragNode = null;
            this.arrangeDragOverIdx = -1;
            this.arrangeDraggingIdx = -1;
        }
    }
};
