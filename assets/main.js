let appData = { bookmarks: [], folders: [] };
let appSettings = { theme: 'blue', darkMode: false, backgroundImage: '' };
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    const bookmarksContainer = document.getElementById('bookmarks-container');
    const emailForm = document.getElementById('emailForm');

    if (bookmarksContainer) {
        initNavigation();
    }

    if (emailForm) {
        initEmailPage();
    }
});

async function initNavigation() {
    await loadAllData();
    renderSidebar();
    renderBookmarks();
    loadSettings();
}

async function loadAllData() {
    try {
        const response = await fetch('api.php?action=get_all_data');
        const result = await response.json();
        if (result.status === 'success') {
            appData.bookmarks = result.bookmarks || [];
            appData.folders = result.folders || [];
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

async function loadSettings() {
    try {
        const response = await fetch('api.php?action=get_settings');
        const result = await response.json();
        if (result.status === 'success') {
            appSettings = result.settings;
            applyTheme(appSettings.theme);
            if (appSettings.backgroundImage) {
                // 使用setBackground函数确保背景图片正确应用
                setBackground(appSettings.backgroundImage);
            }
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

function applyTheme(theme) {
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
    if (appSettings.darkMode) {
        document.body.classList.add('theme-dark');
    }
}

// 存储文件夹展开状态
let folderExpandState = {};

function renderSidebar() {
    const menu = document.getElementById('sidebarMenu');
    if (!menu) return;

    menu.innerHTML = '';

    // 递归渲染多级分类
    function renderFolders(folders, parentId = '', level = 0) {
        const parentFolders = folders.filter(f => f.parent_id === parentId);

        parentFolders.forEach((folder) => {
            // 检查是否有子分类
            const hasChildren = folders.some(f => f.parent_id === folder.id);

            // 获取当前文件夹的展开状态，默认收起（false）
            const isExpanded = folderExpandState[folder.id] === true;

            const item = document.createElement('div');
            item.className = 'nav-item';
            // Indent for sub-levels
            if (level > 0) {
                item.style.paddingLeft = `${25 + level * 15}px`;
                item.style.fontSize = '13px';
            }

            // Click handler: if has children, toggle expansion; else scroll
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (hasChildren) {
                    // If expanding a top-level, collapse other top-levels first
                    if (level === 0 && !isExpanded) {
                        Object.keys(folderExpandState).forEach(k => {
                            // only collapse other top-levels (those with parent_id === '')
                            const f = appData.folders.find(x => x.id === k);
                            if (f && (!f.parent_id || f.parent_id === '') && k !== folder.id) {
                                folderExpandState[k] = false;
                            }
                        });
                    }
                    folderExpandState[folder.id] = !isExpanded;
                    renderSidebar();
                } else {
                    const section = document.getElementById(`folder-${folder.id}`);
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Update active state
                        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                    }
                }
            });

            let iconClass = 'ri-folder-line';
            // Map some common names to icons if possible, or just use folder icon
            if (folder.name.includes('推荐')) iconClass = 'ri-star-line';
            else if (folder.name.includes('工具')) iconClass = 'ri-tools-line';
            else if (folder.name.includes('设计')) iconClass = 'ri-palette-line';
            else if (folder.name.includes('学习')) iconClass = 'ri-book-open-line';

            let folderContent = '';
            if (hasChildren) {
                folderContent = `
                    <i class="${iconClass}"></i>
                    <span style="flex:1">${folder.name}</span>
                    <i class="ri-arrow-${isExpanded ? 'down' : 'right'}-s-line" style="font-size:12px; opacity:0.7"></i>
                `;
            } else {
                folderContent = `
                    <i class="${iconClass}"></i>
                    <span>${folder.name}</span>
                `;
            }

            item.innerHTML = folderContent;
            menu.appendChild(item);
            
            // 只渲染展开的文件夹的子分类
            if (isExpanded) {
                renderFolders(folders, folder.id, level + 1);
            }
        });
    }
    
    // 渲染顶级分类
    renderFolders(appData.folders);

    // Only show '未分类' in sidebar when there are uncategorized bookmarks
    const uncategorizedCount = appData.bookmarks.filter(b => !b.folder_id).length;
    if (uncategorizedCount > 0) {
        const uncategorized = document.createElement('div');
        uncategorized.className = 'nav-item';
        uncategorized.onclick = () => {
            document.getElementById('folder-default')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            uncategorized.classList.add('active');
        };
        uncategorized.innerHTML = `<i class="ri-folder-unknow-line"></i> <span>未分类</span>`;
        menu.appendChild(uncategorized);
    }
}

function renderBookmarks() {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    container.innerHTML = '';

    if (appData.folders.length === 0 && appData.bookmarks.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center;padding:60px;color:var(--text-muted);">暂无数据，请导入或添加分类。</div>';
        return;
    }

    appData.folders.forEach(folder => {
        const links = appData.bookmarks.filter(b => b.folder_id === folder.id);
        if (links.length > 0) {
            container.appendChild(createSection(folder.name, links, `folder-${folder.id}`));
        }
    });

    const uncategorizedLinks = appData.bookmarks.filter(b => !b.folder_id);
    if (uncategorizedLinks.length > 0) {
        container.appendChild(createSection('未分类', uncategorizedLinks, 'folder-default'));
    }
}

function createSection(name, links, id) {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.id = id;

    const header = document.createElement('div');
    header.className = 'section-title';
    header.innerHTML = `<i class="ri-bookmark-line"></i> ${name}`;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'bookmarks-grid';

    links.forEach(bm => {
        const card = document.createElement('a');
        card.className = 'bookmark-card';
        card.href = bm.url;
        card.target = '_blank';
        
        let hostname = 'example.com';
        try { hostname = new URL(bm.url).hostname; } catch (e) {}
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

        card.innerHTML = `
            <img src="${faviconUrl}" alt="icon" class="bookmark-icon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIxMiIgeTE9IjgiIHgyPSIxMiIgeTI9IjEyIj48L2xpbmU+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMi4wMSIgeTI9IjE2Ij48L2xpbmU+PC9zdmc+'">
            <div class="bookmark-info">
                <div class="bookmark-title" title="${bm.title}">${bm.title}</div>
                <div class="bookmark-desc" title="${bm.description || hostname}">${bm.description || hostname}</div>
            </div>
        `;
        grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
}

// Modal Logic
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
    }
};

// Tab Switching
function switchTab(tabId) {
    // Hide all panels
    document.querySelectorAll('.mgmt-panel').forEach(p => p.classList.remove('active'));
    // Show target panel
    document.getElementById(tabId).classList.add('active');
    
    // Update sidebar active state
    document.querySelectorAll('.mgmt-tab').forEach(t => t.classList.remove('active'));
    // Find the tab that triggered this (simple way: check text or index, but here we rely on onclick)
    // Better: pass 'this' or use event delegation. For now, let's just highlight based on index or simple logic
    // Actually, let's just update the UI based on the clicked element if possible.
    // Since we don't have the element reference easily here without changing HTML, let's skip sidebar update or fix HTML.
    // Let's assume the user clicks the tab and we can use event.target
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Theme & Background Logic (Mock implementation for UI demo)
function saveTheme(theme) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    // Apply theme logic here...
    alert('Theme ' + theme + ' selected (Demo)');
}

function setBackground(bg) {
    // Apply background logic here...
    alert('Background selected (Demo)');
}

// Add Bookmark Logic
async function addBookmark() {
    const title = document.getElementById('bmTitle').value;
    const url = document.getElementById('bmUrl').value;
    const folderId = document.getElementById('folderSelect').value;

    if (!title || !url) {
        alert('请输入标题和链接');
        return;
    }

    try {
        const response = await fetch('api.php?action=add_bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                url: url,
                folder_id: folderId
            })
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            closeModal('addModal');
            // Clear inputs
            document.getElementById('bmTitle').value = '';
            document.getElementById('bmUrl').value = '';
            await loadAllData();
            renderSidebar();
            renderBookmarks();
        } else {
            alert(result.message || '添加失败');
        }
    } catch (error) {
        console.error('添加失败:', error);
        alert('请求失败');
    }
}

// Open Add Modal and populate folders
function openAddModal() {
    const select = document.getElementById('folderSelect');
    if (select) {
        select.innerHTML = '<option value="">未分类</option>';
        appData.folders.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            select.appendChild(opt);
        });
    }
    openModal('addModal');
}

// 打开编辑分类模态框
async function editFolder(id) {
    const modalTitle = document.getElementById('folderModalTitle');
    const folderIdInput = document.getElementById('folderId');
    const folderNameInput = document.getElementById('folderName');
    const folderParentSelect = document.getElementById('folderParent');
    
    // 查找分类
    const folder = appData.folders.find(f => f.id === id);
    if (!folder) return;
    
    modalTitle.textContent = '编辑分类';
    folderIdInput.value = folder.id;
    folderNameInput.value = folder.name;
    
    // 填充父分类选项
    folderParentSelect.innerHTML = '<option value="">无（顶级分类）</option>';
    appData.folders.forEach(f => {
        if (f.id !== id) {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            if (f.id === folder.parent_id) {
                opt.selected = true;
            }
            folderParentSelect.appendChild(opt);
        }
    });
    
    openModal('folderModal');
}

// 保存分类（添加或编辑）
async function saveFolder() {
    const folderId = document.getElementById('folderId').value;
    const folderName = document.getElementById('folderName').value.trim();
    const folderParent = document.getElementById('folderParent').value;
    
    if (!folderName) {
        alert('请输入分类名称');
        return;
    }
    
    try {
        const action = folderId ? 'update_folder' : 'add_folder';
        const response = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: folderId,
                name: folderName,
                parent_id: folderParent
            })
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            if (folderId) {
                // 更新现有分类
                const index = appData.folders.findIndex(f => f.id === folderId);
                if (index !== -1) {
                    appData.folders[index] = { ...appData.folders[index], name: folderName, parent_id: folderParent };
                }
            } else {
                // 添加新分类
                appData.folders.push(result.data);
            }
            
            closeModal('folderModal');
            renderSidebar();
            renderBookmarks();
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        alert('请求失败');
        console.error('保存分类失败:', error);
    }
}

async function deleteFolder(id) {
    if (!confirm('确定要删除此分类吗？分类下的书签将移至未分类。')) return;

    try {
        const response = await fetch('api.php?action=delete_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            await loadAllData();
            renderSidebar();
            renderBookmarks();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        alert('请求失败');
    }
}

async function deleteBookmark(id) {
    if (!confirm('确定要删除这个网站吗？')) return;

    try {
        const response = await fetch('api.php?action=delete_bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            await loadAllData();
            renderBookmarks();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        alert('请求失败');
    }
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api.php?action=import_bookmarks', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`成功导入 ${result.count} 个书签！`);
            await loadAllData();
            renderSidebar();
            renderBookmarks();
        } else {
            alert(result.message || '导入失败');
        }
    } catch (error) {
        alert('导入请求失败');
    }
    event.target.value = '';
}

function exportBookmarks() {
    const data = {
        bookmarks: appData.bookmarks,
        folders: appData.folders,
        export_date: new Date().toLocaleString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (id === 'folderModal') document.getElementById('folderName').value = '';
    if (id === 'addModal') {
        document.getElementById('bmTitle').value = '';
        document.getElementById('bmUrl').value = '';
    }
}

async function openAddModal() {
    const select = document.getElementById('folderSelect');
    if (!select) return;
    select.innerHTML = '<option value="">未分类</option>';
    appData.folders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        select.appendChild(opt);
    });
    openModal('addModal');
}

async function addBookmark() {
    const title = document.getElementById('bmTitle').value.trim();
    const url = document.getElementById('bmUrl').value.trim();
    const folderId = document.getElementById('folderSelect').value;

    if (!title || !url) {
        alert('请填写标题和链接');
        return;
    }

    try {
        const response = await fetch('api.php?action=add_bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title, url: url, folder_id: folderId })
        });
        const result = await response.json();
        if (result.status === 'success') {
            closeModal('addModal');
            await loadAllData();
            renderBookmarks();
        } else {
            alert(result.message || '添加失败');
        }
    } catch (error) {
        alert('请求失败');
    }
}

function toggleEditMode() {
    document.body.classList.toggle('edit-mode');
    const btn = document.getElementById('editModeBtn');
    btn.innerHTML = document.body.classList.contains('edit-mode')
        ? '<i class="ri-check-line"></i> 完成编辑'
        : '<i class="ri-edit-line"></i> 编辑模式';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// --- Settings & Theme ---

async function saveTheme(theme) {
    appSettings.theme = theme;
    applyTheme(theme);
    try {
        await fetch('api.php?action=save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appSettings)
        });
    } catch (e) { console.error(e); }
}

async function handleBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api.php?action=upload_background', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === 'success') {
            appSettings.backgroundImage = result.path;
            document.body.style.backgroundImage = `url(${result.path})`;
            document.body.classList.add('has-bg');
            await fetch('api.php?action=save_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appSettings)
            });
        }
    } catch (e) {
        alert('上传失败');
    }
    event.target.value = '';
}

function setBackground(imagePath) {
    appSettings.backgroundImage = imagePath;
    if (imagePath) {
        // 检查是否为预设背景（使用渐变）
        if (imagePath.startsWith('backgrounds/')) {
            // 根据路径设置对应的渐变背景
            const gradientMap = {
                'backgrounds/gradient1.jpg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'backgrounds/gradient2.jpg': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'backgrounds/gradient3.jpg': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'backgrounds/gradient4.jpg': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'backgrounds/gradient5.jpg': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
            };
            
            const gradient = gradientMap[imagePath];
            if (gradient) {
                document.body.style.backgroundImage = gradient;
                document.body.classList.add('has-bg');
            } else {
                // 如果不是预设渐变，尝试使用URL加载
                document.body.style.backgroundImage = `url(${imagePath})`;
                document.body.classList.add('has-bg');
            }
        } else {
            // 自定义背景图片
            document.body.style.backgroundImage = `url(${imagePath})`;
            document.body.classList.add('has-bg');
        }
    } else {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('has-bg');
    }
    
    // 保存设置
    fetch('api.php?action=save_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings)
    });
}

function removeBg() {
    setBackground('');
}

// 管理中心选项卡切换
function switchTab(tabId) {
    // 切换选项卡激活状态
    const tabs = document.querySelectorAll('.mgmt-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 找到当前点击的选项卡并激活
    const activeTab = event.target.closest('.mgmt-tab');
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 切换面板显示
    const panels = document.querySelectorAll('.mgmt-panel');
    panels.forEach(panel => panel.classList.remove('active'));
    
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

// --- Email Page Logic ---

function initEmailPage() {
    loadDomains();
    setupAttachments();

    const domainSelect = document.getElementById('domain_select');
    const fromNameInput = document.getElementById('from_name');

    if (domainSelect && fromNameInput) {
        const updatePreview = () => {
            const name = fromNameInput.value || '...';
            const domain = domainSelect.options[domainSelect.selectedIndex]?.getAttribute('data-domain') || '...';
            document.getElementById('preview_email').textContent = `${name} <${name}@${domain}>`;
        };
        const updateUsage = () => {
            const domainId = domainSelect.value;
            if (domainId) loadUsageStats(domainId);
        };

        fromNameInput.addEventListener('input', updatePreview);
        domainSelect.addEventListener('change', () => { updatePreview(); updateUsage(); });
    }

    document.getElementById('emailForm').addEventListener('submit', handleEmailSend);
}

function setupAttachments() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = ''; });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) return;
        selectedFiles.push(file);
    });
    renderFileList();
}

function renderFileList() {
    const container = document.getElementById('fileList');
    if (!container) return;
    container.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<span>${file.name} (${formatSize(file.size)})</span><i class="ri-close-line remove-file" onclick="removeFile(${index})"></i>`;
        container.appendChild(item);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function loadDomains() {
    const select = document.getElementById('domain_select');
    if (!select) return;
    try {
        const response = await fetch('api.php?action=get_domains');
        const domains = await response.json();
        select.innerHTML = '';
        if (domains.length === 0) {
            select.innerHTML = '<option>无可用域名</option>';
            return;
        }
        domains.forEach((d, index) => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.text = `@${d.domain} (${d.label})`;
            opt.setAttribute('data-domain', d.domain);
            select.appendChild(opt);
            if (index === 0) {
                document.getElementById('preview_email').textContent = `... <...@${d.domain}>`;
                loadUsageStats(d.id);
            }
        });
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option>加载失败</option>';
    }
}

async function loadUsageStats(domainId) {
    const dailyUsed = document.getElementById('dailyUsed');
    if (!dailyUsed) return;
    try {
        const response = await fetch(`api.php?action=get_usage&domain_id=${domainId}`);
        const stats = await response.json();
        const dailyPct = Math.min(100, (stats.daily_used / stats.daily_limit) * 100);
        const monthlyPct = Math.min(100, (stats.monthly_used / stats.monthly_limit) * 100);

        dailyUsed.textContent = `${stats.daily_used} / ${stats.daily_limit}`;
        document.getElementById('monthlyUsed').textContent = `${stats.monthly_used} / ${stats.monthly_limit}`;
        document.getElementById('dailyBar').style.width = `${dailyPct}%`;
        document.getElementById('monthlyBar').style.width = `${monthlyPct}%`;

        const color = pct => pct > 90 ? 'var(--danger-500)' : (pct > 70 ? 'var(--warning-500)' : 'var(--primary-500)');
        document.getElementById('dailyBar').style.backgroundColor = color(dailyPct);
        document.getElementById('monthlyBar').style.backgroundColor = color(monthlyPct);
    } catch (error) {
        console.error(error);
    }
}

async function handleEmailSend(event) {
    event.preventDefault();
    const btn = document.getElementById('sendBtn');
    const statusDiv = document.getElementById('statusMessage');

    const to = document.getElementById('to').value;
    const subject = document.getElementById('subject').value;
    const content = document.getElementById('content').value;
    const fromName = document.getElementById('from_name').value;
    const domainId = document.getElementById('domain_select').value;

    if (!fromName || !domainId) {
        alert('请填写发件人姓名并选择域名');
        return;
    }

    btn.disabled = true;
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 发送中...';
    statusDiv.innerHTML = '';
    statusDiv.className = '';

    try {
        const attachments = [];
        for (const file of selectedFiles) {
            attachments.push({ filename: file.name, content: await readFileAsBase64(file) });
        }

        const response = await fetch('api.php?action=send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to, subject,
                html: content.replace(/\n/g, '<br>'),
                text: content,
                from_name: fromName,
                domain_id: domainId,
                attachments: attachments
            })
        });

        const result = await response.json();
        if (result.success) {
            statusDiv.innerHTML = `<i class="ri-check-line"></i> 邮件发送成功！`;
            statusDiv.className = 'status-msg success';
            document.getElementById('to').value = '';
            document.getElementById('subject').value = '';
            document.getElementById('content').value = '';
            selectedFiles = [];
            renderFileList();
            loadUsageStats(domainId);
        } else {
            statusDiv.innerHTML = `<i class="ri-error-warning-line"></i> 发送失败: ${result.message || '未知错误'}`;
            statusDiv.className = 'status-msg error';
        }
    } catch (error) {
        statusDiv.innerHTML = `<i class="ri-error-warning-line"></i> 错误: ${error.message}`;
        statusDiv.className = 'status-msg error';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}
