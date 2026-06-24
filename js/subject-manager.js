// Subject Manager Component
const SubjectManager = {
    template: `
    <div class="subject-manager">
        <div class="controls">
            <div class="search-wrap">
                <span class="search-icon">⌕</span>
                <input
                    type="text"
                    class="search-bar"
                    v-model="searchTerm"
                    placeholder="搜索题目、目录或内容…"
                    @input="filterSubjects"
                >
            </div>
            <button class="btn btn-primary" @click="showAddModal">＋ 新增题目</button>
            <button class="btn btn-secondary" @click="showDirManager">目录管理</button>
            <button class="btn btn-secondary" @click="exportSubjects">导出</button>
            <button class="btn btn-secondary" @click="triggerImport">导入</button>
            <input type="file" ref="importInput" accept=".json" @change="handleImportFile" style="display:none">
        </div>

        <table v-if="filteredSubjects.length > 0">
            <thead>
                <tr>
                    <th></th>
                    <th>题目名称</th>
                    <th>目录</th>
                    <th>创建时间</th>
                    <th>内容预览</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(subject, idx) in filteredSubjects"
                    :key="subject.id"
                    :draggable="!isTouch && !searchTerm"
                    :class="{
                        'drag-over': dragOverIdx === idx,
                        'dragging': draggingIdx === idx,
                        'drag-disabled': !!searchTerm
                    }"
                    @dragstart="!isTouch && !searchTerm && onRowDragStart(idx, $event)"
                    @dragover.prevent="!isTouch && !searchTerm && onRowDragOver(idx)"
                    @drop="!isTouch && !searchTerm && onRowDrop(idx)"
                    @dragend="!isTouch && onRowDragEnd()"
                    @touchstart.passive="isTouch && !searchTerm && onRowTouchStart(idx, $event)"
                    @touchmove.prevent="isTouch && !searchTerm && onRowTouchMove($event)"
                    @touchend="isTouch && !searchTerm && onRowTouchEnd($event)"
                >
                    <td class="td-drag" v-if="!searchTerm">⠿</td>
                    <td class="td-name">{{ subject.subject_name }}</td>
                    <td><span class="dir-badge">{{ subject.subject_dir }}</span></td>
                    <td class="td-date">{{ formatDateTime(subject.created_at) }}</td>
                    <td class="td-preview">{{ subject.subject_content.substring(0, 50) }}{{ subject.subject_content.length > 50 ? '…' : '' }}</td>
                    <td>
                        <div class="td-actions">
                            <button class="btn btn-primary btn-sm" @click="startDictation(subject)">听写</button>
                            <button class="btn btn-secondary btn-sm" @click="showEditModal(subject)">编辑</button>
                            <button class="btn btn-danger btn-sm" @click="confirmDelete(subject)">删除</button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div v-else-if="!loading" class="no-data">暂无题目 · 点击「＋ 新增题目」开始创建</div>
        <div v-else class="no-data">加载中…</div>

        <!-- Add/Edit Modal -->
        <div class="modal modal-edit" v-if="showModal">
            <div class="modal-content">
                <span class="close" @click="closeModal">&times;</span>
                <h3>{{ modalTitle }}</h3>
                <div class="form-group">
                    <label>题目名称</label>
                    <input type="text" v-model="currentSubject.subject_name" :disabled="isEditing" placeholder="题目名称">
                </div>
                <div class="form-group">
                    <label>题目目录</label>
                    <select v-if="!isEditing" v-model="currentSubject.subject_dir">
                        <option value="">请选择目录</option>
                        <option v-for="dir in directories" :key="dir" :value="dir">{{ dir }}</option>
                    </select>
                    <input v-else type="text" v-model="currentSubject.subject_dir" disabled>
                </div>
                <div class="form-group">
                    <label>题目内容</label>
                    <textarea v-model="currentSubject.subject_content" placeholder="每行一个词语或句子"></textarea>
                </div>
                <div class="form-group" style="display:flex; gap:8px; margin-top:4px;">
                    <button class="btn btn-primary" @click="saveSubject">{{ isEditing ? '更新' : '保存' }}</button>
                    <button class="btn btn-secondary" @click="closeModal">取消</button>
                    <button class="btn btn-success" @click="startDictation(currentSubject)">直接听写</button>
                </div>
            </div>
        </div>

        <!-- Directory Manager Modal -->
        <div class="modal modal-dir" v-if="showDirModal">
            <div class="modal-content">
                <span class="close" @click="closeDirModal">&times;</span>
                <h3>目录管理</h3>
                <div class="form-group">
                    <label>新建目录</label>
                    <div class="form-inline">
                        <input type="text" v-model="newDirName" placeholder="目录名称">
                        <button class="btn btn-primary" @click="createDirectory">创建</button>
                    </div>
                </div>

                <div class="form-group">
                    <h4>现有目录</h4>
                    <div v-for="dir in directories" :key="dir" class="dir-item-row">
                        <strong>{{ dir }}</strong>
                        <div class="dir-item-actions">
                            <button class="btn btn-secondary btn-sm" @click="loadSubjectsByDir(dir)">
                                {{ expandedDir === dir ? '收起' : '查看' }}
                            </button>
                            <button class="btn btn-danger btn-sm" @click="confirmDeleteDirectory(dir)">删除</button>
                        </div>
                    </div>
                    <div v-for="dir in directories" :key="'subjects-' + dir">
                        <div v-if="expandedDir === dir" class="dir-subjects-list">
                            <div v-for="subject in subjectsByDir[dir]" :key="subject.id" class="dir-subject-item">
                                <span>{{ subject.subject_name }}</span>
                                <div class="dir-item-actions">
                                    <button class="btn btn-primary btn-sm" @click="startDictation(subject)">听写</button>
                                    <button class="btn btn-secondary btn-sm" @click="showEditModal(subject)">编辑</button>
                                    <button class="btn btn-danger btn-sm" @click="confirmDelete(subject)">删除</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="btn btn-secondary" @click="closeDirModal">关闭</button>
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div class="modal modal-confirm" v-if="showConfirmModal">
            <div class="modal-content" style="max-width:440px;">
                <h3>确认操作</h3>
                <p style="color:var(--ink-mid); line-height:1.7; padding:12px 0 20px; border-bottom:1px dashed var(--border-lt);">{{ confirmMessage }}</p>
                <div style="display:flex; gap:8px; margin-top:16px;">
                    <button class="btn btn-danger" @click="confirmAction">确认删除</button>
                    <button class="btn btn-secondary" @click="cancelConfirm">取消</button>
                </div>
            </div>
        </div>

        <!-- Import Conflict Modal -->
        <div class="modal" v-if="showImportConflictModal">
            <div class="modal-content" style="max-width:500px;">
                <h3>导入冲突</h3>
                <p style="color:var(--ink-mid); padding:8px 0;">以下题目在云端已存在，请选择处理方式：</p>
                <div class="import-conflict-list">
                    <div v-for="s in importConflicts" :key="s.subject_name + s.subject_dir" class="import-conflict-item">
                        <span class="dir-badge">{{ s.subject_dir }}</span> {{ s.subject_name }}
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:16px;">
                    <button class="btn btn-danger" @click="doImport(true)">覆盖全部</button>
                    <button class="btn btn-secondary" @click="doImport(false)">跳过冲突</button>
                </div>
            </div>
        </div>

        <!-- Toast 提示弹窗 -->
        <div class="modal modal-edit" v-if="showToast" @click.self="closeToast">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <p style="color:var(--ink-mid); line-height:1.7; padding:12px 0 20px;">{{ toastMessage }}</p>
                <button class="btn btn-primary" @click="closeToast">确定</button>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            subjects: [],
            filteredSubjects: [],
            searchTerm: '',
            showModal: false,
            showDirModal: false,
            showConfirmModal: false,
            isEditing: false,
            loading: false,
            currentSubject: {
                subject_name: '',
                subject_dir: '',
                subject_content: ''
            },
            modalTitle: '',
            directories: [],
            subjectsByDir: {},
            expandedDir: null,
            newDirName: '',
            confirmMessage: '',
            confirmCallback: null,
            showToast: false,
            toastMessage: '',
            showImportConflictModal: false,
            importConflicts: [],
            importPending: null,
            draggingIdx: null,
            dragOverIdx: null,
            touchDraggingIdx: null,
            touchPlaceholderIdx: null,
            touchStartY: 0,
            touchRowHeight: 0,
        };
    },
    mounted() {
        this.loadSubjects();
        this.loadDirectories();
        // 登录后切换到云端数据
        this._onLogin = () => {
            this.loadSubjects();
            this.loadDirectories();
        };
        window.addEventListener('dt:login', this._onLogin);
        // 登出后切换回本地数据
        this._onLogout = () => {
            this.loadSubjects();
            this.loadDirectories();
        };
        window.addEventListener('dt:logout', this._onLogout);
    },
    unmounted() {
        window.removeEventListener('dt:login', this._onLogin);
        window.removeEventListener('dt:logout', this._onLogout);
    },
    methods: {
        async loadSubjects() {
            this.loading = true;
            try {
                if (Api.isLoggedIn()) {
                    this.subjects = await Api.getSubjects();
                } else {
                    const data = localStorage.getItem('dictation_subjects');
                    this.subjects = data ? JSON.parse(data) : [];
                }
                this.filterSubjects();
            } catch (e) {
                this.toast('加载题目失败：' + e.message);
            } finally {
                this.loading = false;
            }
        },

        loadSubjectsByDir(dir) {
            if (this.expandedDir === dir) {
                this.expandedDir = null;
                return;
            }
            this.subjectsByDir[dir] = this.subjects.filter(s => s.subject_dir === dir);
            this.expandedDir = dir;
        },

        async loadDirectories() {
            try {
                if (Api.isLoggedIn()) {
                    this.directories = await Api.getDirs();
                } else {
                    const data = localStorage.getItem('dictation_dirs');
                    this.directories = data ? JSON.parse(data) : [];
                }
            } catch (e) {
                this.toast('加载目录失败：' + e.message);
            }
        },

        filterSubjects() {
            let filtered = this.subjects;

            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                filtered = this.subjects.filter(subject =>
                    subject.subject_name.toLowerCase().includes(term) ||
                    subject.subject_dir.toLowerCase().includes(term) ||
                    subject.subject_content.toLowerCase().includes(term)
                );
            }

            this.filteredSubjects = filtered;
        },

        showAddModal() {
            this.isEditing = false;
            this.currentSubject = { subject_name: '', subject_dir: '', subject_content: '' };
            this.loadDirectories();
            this.modalTitle = '新增题目';
            this.showModal = true;
        },

        showEditModal(subject) {
            this.isEditing = true;
            this.currentSubject = { ...subject };
            this.modalTitle = '编辑题目';
            this.showModal = true;
        },

        closeModal() {
            this.showModal = false;
        },

        showDirManager() {
            this.showDirModal = true;
        },

        closeDirModal() {
            this.showDirModal = false;
            this.expandedDir = null;
        },

        async saveSubject() {
            if (!/^[一-龥a-zA-Z0-9_.\- ]+$/.test(this.currentSubject.subject_name)) {
                this.toast('题目名称不能为空或含有特殊字符');
                return;
            }
            if (!/^[一-龥a-zA-Z0-9_.\- ]+$/.test(this.currentSubject.subject_dir)) {
                this.toast('题目目录不能为空或含有特殊字符');
                return;
            }
            if (!this.currentSubject.subject_content.trim()) {
                this.toast('题目内容不能为空');
                return;
            }

            try {
                if (Api.isLoggedIn()) {
                    if (this.isEditing) {
                        await Api.updateSubject(this.currentSubject.id, this.currentSubject.subject_content);
                    } else {
                        await Api.createSubject(
                            this.currentSubject.subject_name,
                            this.currentSubject.subject_dir,
                            this.currentSubject.subject_content
                        );
                    }
                } else {
                    const subjects = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
                    if (this.isEditing) {
                        const idx = subjects.findIndex(s =>
                            s.subject_name === this.currentSubject.subject_name &&
                            s.subject_dir === this.currentSubject.subject_dir
                        );
                        if (idx !== -1) subjects[idx].subject_content = this.currentSubject.subject_content;
                    } else {
                        const exists = subjects.some(s =>
                            s.subject_name === this.currentSubject.subject_name &&
                            s.subject_dir === this.currentSubject.subject_dir
                        );
                        if (exists) {
                            this.toast(`题目 ${this.currentSubject.subject_name} 在目录 ${this.currentSubject.subject_dir} 中已存在`);
                            return;
                        }
                        subjects.unshift({
                            id: Date.now().toString(),
                            subject_name: this.currentSubject.subject_name,
                            subject_dir: this.currentSubject.subject_dir,
                            subject_content: this.currentSubject.subject_content,
                            created_at: new Date().toISOString()
                        });
                    }
                    localStorage.setItem('dictation_subjects', JSON.stringify(subjects));
                }
                this.toast(this.isEditing ? '题目更新成功' : '新增题目保存成功');
                this.closeModal();
                await this.loadSubjects();
            } catch (e) {
                this.toast(e.message);
            }
        },

        confirmDelete(subject) {
            this.confirmMessage = `确定要删除题目 "${subject.subject_name}" 吗？`;
            this.confirmCallback = async () => {
                try {
                    if (Api.isLoggedIn()) {
                        await Api.deleteSubject(subject.id);
                    } else {
                        const subjects = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
                        localStorage.setItem('dictation_subjects', JSON.stringify(
                            subjects.filter(s => !(s.subject_name === subject.subject_name && s.subject_dir === subject.subject_dir))
                        ));
                    }
                    this.toast('题目删除成功');
                    await this.loadSubjects();
                } catch (e) {
                    this.toast('删除失败：' + e.message);
                }
            };
            this.showConfirmModal = true;
        },

        confirmDeleteDirectory(dir) {
            this.confirmMessage = `确定要删除目录 "${dir}" 吗？该目录下的所有题目都将被删除！`;
            this.confirmCallback = async () => {
                try {
                    if (Api.isLoggedIn()) {
                        await Api.deleteDir(dir);
                    } else {
                        const subjects = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
                        localStorage.setItem('dictation_subjects', JSON.stringify(subjects.filter(s => s.subject_dir !== dir)));
                        const dirs = JSON.parse(localStorage.getItem('dictation_dirs') || '[]');
                        localStorage.setItem('dictation_dirs', JSON.stringify(dirs.filter(d => d !== dir)));
                    }
                    this.toast('目录删除成功');
                    await this.loadSubjects();
                    await this.loadDirectories();
                    this.expandedDir = null;
                } catch (e) {
                    this.toast('删除失败：' + e.message);
                }
            };
            this.showConfirmModal = true;
        },

        confirmAction() {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.showConfirmModal = false;
            this.confirmCallback = null;
        },

        cancelConfirm() {
            this.showConfirmModal = false;
            this.confirmCallback = null;
        },

        async createDirectory() {
            if (!this.newDirName.trim()) {
                this.toast('目录名称不能为空');
                return;
            }
            if (!/^[一-龥a-zA-Z0-9_.\- ]+$/.test(this.newDirName)) {
                this.toast('目录名称不能为空或含有特殊字符');
                return;
            }
            try {
                if (Api.isLoggedIn()) {
                    await Api.createDir(this.newDirName);
                } else {
                    const dirs = JSON.parse(localStorage.getItem('dictation_dirs') || '[]');
                    if (!dirs.includes(this.newDirName)) {
                        dirs.push(this.newDirName);
                        localStorage.setItem('dictation_dirs', JSON.stringify(dirs));
                    }
                }
                this.toast('目录创建成功');
                await this.loadDirectories();
                this.newDirName = '';
            } catch (e) {
                this.toast(e.message);
            }
        },

        startDictation(subject) {
            this.$emit('start-dictation', subject);
        },

        formatDateTime(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN');
        },

        toast(message) {
            this.toastMessage = message;
            this.showToast = true;
        },

        closeToast() {
            this.showToast = false;
            this.toastMessage = '';
        },

        // ── 拖拽排序（PC） ────────────────────────────────────────────────
        onRowDragStart(idx, e) {
            this.draggingIdx = idx;
            e.dataTransfer.effectAllowed = 'move';
        },

        onRowDragOver(idx) {
            if (this.draggingIdx === null || this.draggingIdx === idx) return;
            this.dragOverIdx = idx;
        },

        onRowDrop(idx) {
            if (this.draggingIdx === null || this.draggingIdx === idx) return;
            const arr = [...this.filteredSubjects];
            const [moved] = arr.splice(this.draggingIdx, 1);
            arr.splice(idx, 0, moved);
            this.filteredSubjects = arr;
            this.subjects = arr;
            this.draggingIdx = null;
            this.dragOverIdx = null;
            this.saveOrder();
        },

        onRowDragEnd() {
            this.draggingIdx = null;
            this.dragOverIdx = null;
        },

        // ── 拖拽排序（移动端 touch） ──────────────────────────────────────
        onRowTouchStart(idx, e) {
            this.touchDraggingIdx = idx;
            this.touchPlaceholderIdx = idx;
            this.touchStartY = e.touches[0].clientY;
            const tr = e.currentTarget;
            this.touchRowHeight = tr.getBoundingClientRect().height;
            tr.classList.add('touch-dragging');
        },

        onRowTouchMove(e) {
            if (this.touchDraggingIdx === null) return;
            const dy = e.touches[0].clientY - this.touchStartY;
            const steps = Math.round(dy / this.touchRowHeight);
            const newIdx = Math.max(0, Math.min(
                this.filteredSubjects.length - 1,
                this.touchDraggingIdx + steps
            ));
            if (newIdx !== this.touchPlaceholderIdx) {
                this.touchPlaceholderIdx = newIdx;
                this.dragOverIdx = newIdx;
            }
        },

        onRowTouchEnd(e) {
            if (this.touchDraggingIdx === null) return;
            e.currentTarget.classList.remove('touch-dragging');
            const from = this.touchDraggingIdx;
            const to = this.touchPlaceholderIdx;
            this.touchDraggingIdx = null;
            this.touchPlaceholderIdx = null;
            this.dragOverIdx = null;
            if (from === to) return;
            const arr = [...this.filteredSubjects];
            const [moved] = arr.splice(from, 1);
            arr.splice(to, 0, moved);
            this.filteredSubjects = arr;
            this.subjects = arr;
            this.saveOrder();
        },

        async saveOrder() {
            if (Api.isLoggedIn()) {
                try {
                    await Api.reorderSubjects(this.subjects.map(s => s.id));
                } catch (e) {
                    this.toast('保存顺序失败：' + e.message);
                }
            } else {
                localStorage.setItem('dictation_subjects', JSON.stringify(this.subjects));
            }
        },

        exportSubjects() {
            const payload = {
                version: 1,
                exported_at: new Date().toISOString(),
                dirs: this.directories,
                subjects: this.subjects.map(s => ({
                    subject_name: s.subject_name,
                    subject_dir: s.subject_dir,
                    subject_content: s.subject_content,
                    created_at: s.created_at,
                }))
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `dictation-export-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        triggerImport() {
            this.$refs.importInput.value = '';
            this.$refs.importInput.click();
        },

        handleImportFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                let data;
                try {
                    data = JSON.parse(e.target.result);
                } catch {
                    this.toast('文件格式不正确，请选择由本工具导出的 JSON 文件');
                    return;
                }
                if (!data.version || !Array.isArray(data.subjects)) {
                    this.toast('文件格式不正确，请选择由本工具导出的 JSON 文件');
                    return;
                }
                const remoteKeys = new Set(this.subjects.map(s => s.subject_name + '|' + s.subject_dir));
                const conflicts = data.subjects.filter(s => remoteKeys.has(s.subject_name + '|' + s.subject_dir));
                this.importPending = data;
                if (conflicts.length > 0) {
                    this.importConflicts = conflicts;
                    this.showImportConflictModal = true;
                } else {
                    this.doImport(false);
                }
            };
            reader.readAsText(file);
        },

        async doImport(overwrite) {
            this.showImportConflictModal = false;
            const data = this.importPending;
            this.importPending = null;

            const remoteKeys = new Set(this.subjects.map(s => s.subject_name + '|' + s.subject_dir));
            let added = 0, skipped = 0, updated = 0;

            for (const s of data.subjects) {
                const key = s.subject_name + '|' + s.subject_dir;
                const existing = this.subjects.find(r => r.subject_name + '|' + r.subject_dir === key);
                if (existing) {
                    if (overwrite) {
                        try {
                            await Api.updateSubject(existing.id, s.subject_content);
                            updated++;
                        } catch {}
                    } else {
                        skipped++;
                    }
                } else {
                    try {
                        await Api.createSubject(s.subject_name, s.subject_dir, s.subject_content);
                        added++;
                    } catch {}
                }
            }

            // 同步目录
            for (const dir of (data.dirs || [])) {
                if (!this.directories.includes(dir)) {
                    try { await Api.createDir(dir); } catch {}
                }
            }

            const action = overwrite ? `覆盖 ${updated} 条` : `跳过 ${skipped} 条`;
            this.toast(`导入成功：新增 ${added} 条，${action}`);
            await this.loadSubjects();
            await this.loadDirectories();
        }
    }
};
