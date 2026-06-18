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
                    <th
                        @click="sortBy('subject_name')"
                        :class="{ 'sort-asc': sortKey==='subject_name' && sortOrder==='asc', 'sort-desc': sortKey==='subject_name' && sortOrder==='desc' }">
                        题目名称
                    </th>
                    <th
                        @click="sortBy('subject_dir')"
                        :class="{ 'sort-asc': sortKey==='subject_dir' && sortOrder==='asc', 'sort-desc': sortKey==='subject_dir' && sortOrder==='desc' }">
                        目录
                    </th>
                    <th
                        @click="sortBy('created_at')"
                        :class="{ 'sort-asc': sortKey==='created_at' && sortOrder==='asc', 'sort-desc': sortKey==='created_at' && sortOrder==='desc' }">
                        创建时间
                    </th>
                    <th>内容预览</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="subject in filteredSubjects" :key="subject.subject_name + subject.subject_dir">
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

        <div v-else class="no-data">暂无题目 · 点击「＋ 新增题目」开始创建</div>

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
                            <div v-for="subject in subjectsByDir[dir]" :key="subject.subject_name" class="dir-subject-item">
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
                <p style="color:var(--ink-mid); padding:8px 0;">以下题目在本地已存在，请选择处理方式：</p>
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
            sortKey: 'created_at',
            sortOrder: 'desc', // 'asc' or 'desc'
            showModal: false,
            showDirModal: false,
            showConfirmModal: false,
            isEditing: false,
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
            importPending: null
        };
    },
    mounted() {
        this.loadSubjects();
        this.loadDirectories();
    },
    methods: {
        loadSubjects() {
            const data = localStorage.getItem('dictation_subjects');
            this.subjects = data ? JSON.parse(data) : [];
            this.filteredSubjects = [...this.subjects];
            this.extractDirectories();
        },

        loadSubjectsByDir(dir) {
            if (this.expandedDir === dir) {
                this.expandedDir = null;
                return;
            }
            const data = localStorage.getItem('dictation_subjects');
            const subjects = data ? JSON.parse(data) : [];
            this.subjectsByDir[dir] = subjects.filter(s => s.subject_dir === dir);
            this.expandedDir = dir;
        },

        extractDirectories() {
            const dirs = new Set();
            this.subjects.forEach(subject => {
                dirs.add(subject.subject_dir);
            });
            this.directories = Array.from(dirs);
        },

        loadDirectories() {
            const data = localStorage.getItem('dictation_dirs');
            this.directories = data ? JSON.parse(data) : [];
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

            // Apply sorting
            this.filteredSubjects = filtered.sort((a, b) => {
                let result = 0;

                if (this.sortKey === 'subject_name') {
                    result = a.subject_name.localeCompare(b.subject_name);
                } else if (this.sortKey === 'subject_dir') {
                    result = a.subject_dir.localeCompare(b.subject_dir);
                } else if (this.sortKey === 'created_at') {
                    result = new Date(a.created_at) - new Date(b.created_at);
                }

                return this.sortOrder === 'asc' ? result : -result;
            });
        },

        sortBy(key) {
            if (this.sortKey === key) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortKey = key;
                this.sortOrder = 'asc';
            }
            this.filterSubjects();
        },

        showAddModal() {
            this.isEditing = false;
            this.currentSubject = {
                subject_name: '',
                subject_dir: '',
                subject_content: ''
            };
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

        saveSubject() {
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

            const data = localStorage.getItem('dictation_subjects');
            const subjects = data ? JSON.parse(data) : [];

            if (this.isEditing) {
                const idx = subjects.findIndex(s =>
                    s.subject_name === this.currentSubject.subject_name &&
                    s.subject_dir === this.currentSubject.subject_dir
                );
                if (idx !== -1) {
                    subjects[idx].subject_content = this.currentSubject.subject_content;
                }
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
                    subject_name: this.currentSubject.subject_name,
                    subject_dir: this.currentSubject.subject_dir,
                    subject_content: this.currentSubject.subject_content,
                    created_at: new Date().toISOString()
                });
            }

            localStorage.setItem('dictation_subjects', JSON.stringify(subjects));
            this.closeModal();
            this.toast(this.isEditing ? '题目更新成功' : '新增题目保存成功');
            this.loadSubjects();
        },

        confirmDelete(subject) {
            this.confirmMessage = `确定要删除题目 "${subject.subject_name}" 吗？`;
            this.confirmCallback = () => {
                const data = localStorage.getItem('dictation_subjects');
                const subjects = data ? JSON.parse(data) : [];
                const updated = subjects.filter(s =>
                    !(s.subject_name === subject.subject_name && s.subject_dir === subject.subject_dir)
                );
                localStorage.setItem('dictation_subjects', JSON.stringify(updated));
                this.toast('题目删除成功');
                this.loadSubjects();
            };
            this.showConfirmModal = true;
        },

        confirmDeleteDirectory(dir) {
            this.confirmMessage = `确定要删除目录 "${dir}" 吗？该目录下的所有题目都将被删除！`;
            this.confirmCallback = () => {
                const data = localStorage.getItem('dictation_subjects');
                const subjects = data ? JSON.parse(data) : [];
                localStorage.setItem('dictation_subjects', JSON.stringify(subjects.filter(s => s.subject_dir !== dir)));
                const dirs = localStorage.getItem('dictation_dirs');
                const dirList = dirs ? JSON.parse(dirs) : [];
                localStorage.setItem('dictation_dirs', JSON.stringify(dirList.filter(d => d !== dir)));
                this.toast('目录删除成功');
                this.loadSubjects();
                this.loadDirectories();
                this.expandedDir = null;
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

        createDirectory() {
            if (!this.newDirName.trim()) {
                this.toast('目录名称不能为空');
                return;
            }

            if (!/^[一-龥a-zA-Z0-9_.\- ]+$/.test(this.newDirName)) {
                this.toast('目录名称不能为空或含有特殊字符');
                return;
            }

            const dirs = localStorage.getItem('dictation_dirs');
            const dirList = dirs ? JSON.parse(dirs) : [];
            if (!dirList.includes(this.newDirName)) {
                dirList.push(this.newDirName);
                localStorage.setItem('dictation_dirs', JSON.stringify(dirList));
            }
            this.toast('目录创建成功');
            this.loadDirectories();
            this.newDirName = '';
        },

        startDictation(subject) {
            // Emit an event to switch to dictation view and pass the subject
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

        exportSubjects() {
            const subjects = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
            const dirs = JSON.parse(localStorage.getItem('dictation_dirs') || '[]');
            const payload = {
                version: 1,
                exported_at: new Date().toISOString(),
                dirs,
                subjects
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
                const local = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
                const localKeys = new Set(local.map(s => s.subject_name + '|' + s.subject_dir));
                const conflicts = data.subjects.filter(s => localKeys.has(s.subject_name + '|' + s.subject_dir));
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

        doImport(overwrite) {
            this.showImportConflictModal = false;
            const data = this.importPending;
            this.importPending = null;
            const local = JSON.parse(localStorage.getItem('dictation_subjects') || '[]');
            const localDirs = JSON.parse(localStorage.getItem('dictation_dirs') || '[]');
            const localKeys = new Set(local.map(s => s.subject_name + '|' + s.subject_dir));
            let added = 0;
            let affected = 0;
            if (overwrite) {
                data.subjects.forEach(s => {
                    const key = s.subject_name + '|' + s.subject_dir;
                    const idx = local.findIndex(l => l.subject_name + '|' + l.subject_dir === key);
                    if (idx !== -1) {
                        local[idx] = s;
                        affected++;
                    } else {
                        local.unshift(s);
                        added++;
                    }
                });
            } else {
                data.subjects.forEach(s => {
                    const key = s.subject_name + '|' + s.subject_dir;
                    if (localKeys.has(key)) {
                        affected++;
                    } else {
                        local.unshift(s);
                        added++;
                    }
                });
            }
            const mergedDirs = Array.from(new Set([...localDirs, ...(data.dirs || [])]));
            localStorage.setItem('dictation_subjects', JSON.stringify(local));
            localStorage.setItem('dictation_dirs', JSON.stringify(mergedDirs));
            const action = overwrite ? '覆盖' : '跳过';
            this.toast(`导入成功：新增 ${added} 条，${action} ${affected} 条`);
            this.loadSubjects();
            this.loadDirectories();
        }
    }
};

