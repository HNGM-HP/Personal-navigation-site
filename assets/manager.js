// 全局状态
let bookmarks = [];
let folders = [];
let settings = {};
let currentView = 'dashboard';
let selectedBookmarks = new Set();
let currentPage = 1;
const itemsPerPage = 20;
let filterTimeout = null;
let currentSortBy = 'custom';
let currentCategorySortBy = 'custom';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // We need to check for password first before loading any sensitive data
    checkPasswordStatus();
    loadSettings();
    setupEventListeners();
});

// Check if admin password is set
async function checkPasswordStatus() {
    try {
        const response = await fetch('api.php?action=check_password_status');
        const data = await response.json();
        if (data.status === 'success') {
            if (data.is_set) {
                // Password is set, ask for it
                openModal('passwordModal', true);
                // Change modal to login mode
                document.querySelector('#passwordModal .modal-title').textContent = '请输入密码';
                document.querySelector('#passwordModal form').onsubmit = verifyPassword;
                // 自动聚焦密码输入框
                setTimeout(() => { const pi = document.getElementById('passwordInput'); if (pi) pi.focus(); }, 60);
            } else {
                // Password is not set, force user to create one
                openModal('newPasswordModal');
                // 自动聚焦新密码输入框
                setTimeout(() => { const ni = document.getElementById('newPasswordInput'); if (ni) ni.focus(); }, 60);
            }
        }
    } catch (error) {
        showAlert('无法检查系统状态', 'error');
    }
}

// Load data after password verification
async function initializeManager() {
    closeModal('passwordModal');
    loadData();
}

// 加载数据
async function loadData() {
    try {
        // 显示加载指示器
        const loaderEl = document.createElement('div');
        loaderEl.className = 'spinner';
        loaderEl.style.position = 'fixed';
        loaderEl.style.top = '50%';
        loaderEl.style.left = '50%';
        loaderEl.style.zIndex = '9999';
        document.body.appendChild(loaderEl);

        const response = await fetch('api.php?action=get_all_data');
        const data = await response.json();
        
        loaderEl.remove();
        
        if (data.status === 'success') {
            bookmarks = data.bookmarks || [];
            folders = data.folders || [];
            renderDashboard();
            renderFolderTree();
            renderBookmarks();
            updateCategories();
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        showAlert('加载数据失败', 'error');
    }
}

// 加载设置
async function loadSettings() {
    try {
        const response = await fetch('api.php?action=get_settings');
        const data = await response.json();
        if (data.status === 'success') {
            settings = data.settings || {};
            applySettings();
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 应用设置
function applySettings() {
    // 应用主题
    if (settings.theme) {
        document.body.className = document.body.className.replace(/theme-\w+/, '');
        document.body.classList.add('theme-' + settings.theme);
    }

    // 应用暗黑模式
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }

    // 应用背景
    if (settings.backgroundImage) {
        document.body.style.backgroundImage = `url('${settings.backgroundImage}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
    }
}

// 设置事件监听
function setupEventListeners() {
    document.getElementById('bgUpload').addEventListener('click', () => {
        document.getElementById('bgFile').click();
    });

    // New event listener for file import
    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        importFileInput.addEventListener('change', (event) => {
            const fileNameDisplay = document.getElementById('fileName');
            if (event.target.files.length > 0) {
                fileNameDisplay.textContent = event.target.files[0].name;
                fileNameDisplay.style.fontStyle = 'normal';
            } else {
                fileNameDisplay.textContent = '未选择文件';
                fileNameDisplay.style.fontStyle = 'italic';
            }
        });
    }

    // Column Resizing Logic
    setupColumnResizing();
}

function setupColumnResizing() {
    const table = document.getElementById('bookmarksTable');
    const cols = table.querySelectorAll('th.resizable');
    
    // Load saved widths
    const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
    cols.forEach(col => {
        const colName = col.dataset.col;
        if (savedWidths[colName]) {
            col.style.width = savedWidths[colName];
        }
    });

    cols.forEach(col => {
        const resizer = col.querySelector('.resizer');
        if (!resizer) return;

        let startX, startWidth;

        const onMouseMove = (e) => {
            if (startX) {
                const diff = e.pageX - startX;
                const newWidth = Math.max(50, startWidth + diff); // Min width 50px
                col.style.width = newWidth + 'px';
            }
        };

        const onMouseUp = () => {
            if (startX) {
                // Save width
                const widths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
                widths[col.dataset.col] = col.style.width;
                localStorage.setItem('columnWidths', JSON.stringify(widths));
                
                startX = null;
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        resizer.addEventListener('mousedown', (e) => {
            startX = e.pageX;
            startWidth = col.offsetWidth;
            resizer.classList.add('resizing');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault(); // Prevent text selection
        });
    });
}

// 切换视图
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(view + '-view').classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Find the right nav item to activate
    const navItems = document.querySelectorAll('.nav-item');
    const targetNavItem = Array.from(navItems).find(item => {
        const onclickAttr = item.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(`switchView('${view}')`);
    });
    
    if (targetNavItem) {
        targetNavItem.classList.add('active');
    }

    // 更新页面标题
    const titles = {
        dashboard: '仪表板',
        bookmarks: '书签管理',
        categories: '分类管理',
        settings: '主题设置',
        config: '系统配置'
    };
    document.getElementById('pageTitle').textContent = titles[view] || '首页';
    document.getElementById('breadcrumb').textContent = '首页 / ' + (titles[view] || '');
}

// 渲染仪表板
function renderDashboard() {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const stats = {
        total: bookmarks.length,
        categories: folders.length,
        recent: bookmarks.filter(b => new Date(b.add_date * 1000) > recentDate).length
    };

    document.getElementById('totalBookmarks').textContent = stats.total;
    document.getElementById('totalCategories').textContent = stats.categories;
    document.getElementById('recentCount').textContent = stats.recent;
}

// 渲染文件夹树
function renderFolderTree() {
    const tree = document.getElementById('folderTree');
    tree.innerHTML = '';
    // Add "All" root
    const all = document.createElement('div');
    all.className = 'folder-item level-1';
    all.innerHTML = `<i class="ri-folder-open-line"></i> 全部`;
    all.onclick = () => filterByFolder(null);
    tree.appendChild(all);

    // Build children map for quick lookup
    const map = {};
    folders.forEach(f => {
        const pid = f.parent_id || '';
        if (!map[pid]) map[pid] = [];
        map[pid].push(f);
    });

    // Recursive renderer
    const renderNodes = (parentId, level) => {
        const container = document.createDocumentFragment();
        const nodes = map[parentId || ''] || [];
        nodes.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'folder-item level-' + Math.min(level, 6);
            item.dataset.folderId = folder.id;

            const toggle = document.createElement('div');
            toggle.className = 'folder-toggle collapsed';
            toggle.style.display = 'inline-block';
            toggle.style.width = '12px';
            toggle.style.height = '12px';
            toggle.style.marginRight = '8px';
            toggle.style.cursor = 'pointer';

            const icon = document.createElement('i');
            icon.className = 'ri-folder-line';
            icon.style.marginRight = '8px';

            const title = document.createElement('span');
            title.textContent = folder.name;

            item.appendChild(toggle);
            item.appendChild(icon);
            item.appendChild(title);

            // Container for children
            const childContainer = document.createElement('div');
            childContainer.className = 'folder-children';
            childContainer.style.marginLeft = '18px';
            childContainer.style.display = 'none';

            // Click handlers
            title.onclick = (e) => {
                e.stopPropagation();
                // Filter list by this folder
                filterByFolder(folder.id);

                // Also toggle expansion for this item (useful for UX)
                const isCollapsed = toggle.classList.contains('collapsed');
                if (level === 1 && isCollapsed) {
                    // collapse other top-level folders
                    tree.querySelectorAll('.folder-item.level-1 .folder-children').forEach(c => c.style.display = 'none');
                    tree.querySelectorAll('.folder-item.level-1 .folder-toggle').forEach(t => t.classList.remove('expanded'));
                    tree.querySelectorAll('.folder-item.level-1 .folder-toggle').forEach(t => t.classList.add('collapsed'));
                }

                if (isCollapsed) {
                    toggle.classList.remove('collapsed');
                    toggle.classList.add('expanded');
                    childContainer.style.display = 'block';
                } else {
                    toggle.classList.remove('expanded');
                    toggle.classList.add('collapsed');
                    childContainer.style.display = 'none';
                }
            };

            toggle.onclick = (e) => {
                e.stopPropagation();
                const isCollapsed = toggle.classList.contains('collapsed');
                // If top-level, collapse other top-level folders when expanding
                if (level === 1 && isCollapsed) {
                    // collapse all other top-level children
                    tree.querySelectorAll('.folder-item.level-1 .folder-children').forEach(c => c.style.display = 'none');
                    tree.querySelectorAll('.folder-item.level-1 .folder-toggle').forEach(t => t.classList.remove('expanded'));
                    tree.querySelectorAll('.folder-item.level-1 .folder-toggle').forEach(t => t.classList.add('collapsed'));
                }

                if (isCollapsed) {
                    toggle.classList.remove('collapsed');
                    toggle.classList.add('expanded');
                    childContainer.style.display = 'block';
                } else {
                    toggle.classList.remove('expanded');
                    toggle.classList.add('collapsed');
                    childContainer.style.display = 'none';
                }
            };

            // Recursively render children
            const childrenFragment = renderNodes(folder.id, level + 1);
            if (childrenFragment && childrenFragment.childNodes && childrenFragment.childNodes.length > 0) {
                childContainer.appendChild(childrenFragment);
                item.appendChild(childContainer);
            }

            container.appendChild(item);
        });
        return container;
    };

    // Start rendering from root ('') at level 1
    const frag = renderNodes('', 1);
    tree.appendChild(frag);

    // Update file selector after tree render
    updateFolderSelectors();
}

// 更新文件夹选择器
function updateFolderSelectors() {
    const selects = ['bookmarkFolder', 'parentFolder'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = selectId === 'parentFolder' ? '<option value="">根目录</option>' : '';

            // Build hierarchical options
            const map = {};
            folders.forEach(f => {
                const pid = f.parent_id || '';
                if (!map[pid]) map[pid] = [];
                map[pid].push(f);
            });

            const buildOptions = (parentId, depth) => {
                const nodes = map[parentId || ''] || [];
                nodes.forEach(n => {
                    const option = document.createElement('option');
                    option.value = n.id;
                    option.textContent = `${' '.repeat((depth-1)*2)}${depth>1? '▸ ' : ''}${n.name}`;
                    select.appendChild(option);
                    buildOptions(n.id, depth+1);
                });
            };

            buildOptions('', 1);

            if (currentValue) select.value = currentValue;
        }
    });
}

// 按文件夹筛选
function filterByFolder(folderId) {
    const filtered = folderId ? bookmarks.filter(b => b.folder_id === folderId) : bookmarks;
    currentPage = 1;
    renderBookmarksTable(filtered);
}

// 渲染书签表格
function renderBookmarks(filtered = null) {
    const data = filtered || bookmarks;
    const sorted = applySortBookmarks(data);
    renderBookmarksTable(sorted);
}

function renderBookmarksTable(data) {
    const tbody = document.getElementById('bookmarksBody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = data.slice(start, end);

    // 使用Map缓存文件夹查询，避免O(n²)复杂度
    const folderMap = new Map(folders.map(f => [f.id, f]));

    pageData.forEach(bookmark => {
        const row = document.createElement('tr');
        const folder = folderMap.get(bookmark.folder_id);
        const addDate = new Date(bookmark.add_date * 1000).toLocaleDateString('zh-CN');

        row.innerHTML = `
            <td><input type="checkbox" class="bookmark-checkbox" value="${bookmark.id}" onchange="updateBatchDelete()"></td>
            <td>
                <a href="${bookmark.url}" target="_blank" style="color: var(--primary); text-decoration: none;">
                    <i class="ri-link-m"></i> ${bookmark.title}
                </a>
            </td>
            <td class="bookmark-url">${bookmark.url}</td>
            <td>${folder ? folder.name : '未分类'}</td>
            <td>${addDate}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editBookmark('${bookmark.id}')">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteBookmark('${bookmark.id}')">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // 渲染分页
    renderPagination(Math.ceil(data.length / itemsPerPage));
}

// 渲染分页
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        if (i === currentPage) btn.classList.add('active');
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderBookmarks();
        };
        pagination.appendChild(btn);
    }
}

// 过滤书签（带防抖）
function filterBookmarks() {
    // 清除之前的定时器
    if (filterTimeout) clearTimeout(filterTimeout);
    
    filterTimeout = setTimeout(() => {
        const input = document.getElementById('searchInput').value.toLowerCase();
        const filtered = bookmarks.filter(b =>
            b.title.toLowerCase().includes(input) ||
            b.url.toLowerCase().includes(input) ||
            (b.tags && b.tags.join(',').toLowerCase().includes(input))
        );
        currentPage = 1;
        const sorted = applySortBookmarks(filtered);
        renderBookmarksTable(sorted);
    }, 300); // 300ms防抖延迟
}

// 应用书签排序
function applySortBookmarks(data) {
    const sorted = [...data];
    const sortBy = document.getElementById('sortBy')?.value || currentSortBy;
    
    switch(sortBy) {
        case 'custom':
            sorted.sort((a, b) => {
                const orderA = parseInt(a.sort_order || 0);
                const orderB = parseInt(b.sort_order || 0);
                if (orderA !== orderB) return orderA - orderB;
                return (b.add_date || 0) - (a.add_date || 0);
            });
            break;
        case 'date_asc':
            sorted.sort((a, b) => a.add_date - b.add_date);
            break;
        case 'title_asc':
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
            break;
        case 'title_desc':
            sorted.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'));
            break;
        case 'date_desc':
        default:
            sorted.sort((a, b) => b.add_date - a.add_date);
    }
    return sorted;
}

// 处理排序变化
function handleSort() {
    const sortSelect = document.getElementById('sortBy');
    currentSortBy = sortSelect.value;
    currentPage = 1;
    renderBookmarks();
}

// 保存书签
async function saveBookmark(event, existingId = null) {
    event.preventDefault();
    const bookmark = {
        id: existingId,
        title: document.getElementById('bookmarkTitle').value,
        url: document.getElementById('bookmarkUrl').value,
        folder_id: document.getElementById('bookmarkFolder').value,
        tags: document.getElementById('bookmarkTag').value.split(',').map(t => t.trim()).filter(t => t),
        sort_order: document.getElementById('bookmarkOrder').value || 0
    };

    if (!existingId) {
        bookmark.add_date = Math.floor(Date.now() / 1000);
    }

    const action = existingId ? 'update_bookmark' : 'add_bookmark';

    try {
        const response = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookmark)
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert(existingId ? '书签已更新' : '书签已添加', 'success');
            closeModal('addBookmarkModal');
            loadData();
        } else {
            showAlert(data.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('错误:', error);
        showAlert('操作失败', 'error');
    }
}

// 编辑书签
function editBookmark(id) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;

    document.getElementById('bookmarkTitle').value = bookmark.title;
    document.getElementById('bookmarkUrl').value = bookmark.url;
    document.getElementById('bookmarkFolder').value = bookmark.folder_id || '';
    document.getElementById('bookmarkTag').value = bookmark.tags ? bookmark.tags.join(', ') : '';
    document.getElementById('bookmarkOrder').value = bookmark.sort_order || 0;
    
    // Change modal title
    document.querySelector('#addBookmarkModal .modal-title').textContent = '编辑书签';

    // Change form submission to update instead of add
    const form = document.getElementById('addBookmarkModal').querySelector('form');
    form.onsubmit = (event) => saveBookmark(event, id);
    
    // Change back on modal close
    const modal = document.getElementById('addBookmarkModal');
    const originalOnClose = modal.querySelector('.modal-close').onclick;
    modal.querySelector('.modal-close').onclick = () => {
        form.onsubmit = (event) => saveBookmark(event);
        document.querySelector('#addBookmarkModal .modal-title').textContent = '添加书签';
        document.getElementById('bookmarkOrder').value = 0; // Reset order
        originalOnClose();
    };

    openModal('addBookmarkModal');
}

// 删除书签
async function deleteBookmark(id) {
    if (!confirm('确定要删除这个书签吗？')) return;

    try {
        const response = await fetch('api.php?action=delete_bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert('书签已删除', 'success');
            loadData();
        } else {
            showAlert('删除失败', 'error');
        }
    } catch (error) {
        showAlert('删除失败', 'error');
    }
}

// 批量删除
async function batchDelete() {
    const ids = Array.from(selectedBookmarks);
    if (ids.length === 0) {
        showAlert('请选择要删除的书签', 'error');
        return;
    }

    if (!confirm(`确定要删除${ids.length}个书签吗？`)) return;

    try {
        const response = await fetch('api.php?action=batch_delete_bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert(`已删除${ids.length}个书签`, 'success');
            selectedBookmarks.clear();
            updateBatchDelete();
            loadData();
        }
    } catch (error) {
        showAlert('删除失败', 'error');
    }
}

// 更新批量删除按钮
function updateBatchDelete() {
    selectedBookmarks.clear();
    document.querySelectorAll('.bookmark-checkbox:checked').forEach(checkbox => {
        selectedBookmarks.add(checkbox.value);
    });

    const btn = document.getElementById('batchDeleteBtn');
    if (selectedBookmarks.size > 0) {
        btn.style.display = 'inline-flex';
        btn.textContent = `删除选中 (${selectedBookmarks.size})`;
    } else {
        btn.style.display = 'none';
    }
}

// 全选
function toggleSelectAll(checkbox) {
    document.querySelectorAll('.bookmark-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateBatchDelete();
}

// 保存文件夹
async function saveFolder(event, existingId = null) {
    event.preventDefault();
    const folder = {
        id: existingId,
        name: document.getElementById('folderName').value,
        parent_id: document.getElementById('parentFolder').value || null,
        description: document.getElementById('folderDesc').value,
        sort_order: document.getElementById('folderOrder').value || 0
    };
    
    if (!existingId) {
        folder.created_date = Math.floor(Date.now() / 1000);
    }
    
    const action = existingId ? 'update_folder' : 'add_folder';

    try {
        const response = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folder)
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert(existingId ? '文件夹已更新' : '文件夹已创建', 'success');
            closeModal('addFolderModal');
            loadData();
        }
    } catch (error) {
        showAlert('操作失败', 'error');
    }
}

// 更新分类
function updateCategories() {
    const tbody = document.getElementById('categoriesBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Add uncategorized row
    const uncategorizedLinks = bookmarks.filter(b => !b.folder_id);
    const ucRow = document.createElement('tr');
    ucRow.innerHTML = `
        <td>未分类</td>
        <td>-</td>
        <td>${uncategorizedLinks.length}</td>
        <td>0</td>
        <td>
            <button class="btn btn-sm btn-danger" id="deleteUncategorizedBtn">删除全部未分类</button>
        </td>
    `;
    tbody.appendChild(ucRow);
    
    if (uncategorizedLinks.length > 0) {
        document.getElementById('deleteUncategorizedBtn').onclick = async () => {
            if (!confirm('确定删除所有未分类书签吗？此操作不可撤销。')) return;
            try {
                const resp = await fetch('api.php?action=delete_uncategorized', { method: 'POST' });
                const data = await resp.json();
                if (data.status === 'success') {
                    showAlert(`已删除 ${data.deleted} 个未分类书签`, 'success');
                    loadData();
                } else {
                    showAlert(data.message || '删除失败', 'error');
                }
            } catch (err) {
                showAlert('请求失败', 'error');
            }
        };
    }

    // Build children map
    const map = {};
    folders.forEach(f => {
        const pid = f.parent_id || '';
        if (!map[pid]) map[pid] = [];
        map[pid].push(f);
    });

    // Apply sort
    const sortedFolders = applyCategorySort(folders);
    
    // Helper to get sorted children
    const getSortedChildren = (pid) => {
        const children = map[pid] || [];
        return applyCategorySort(children);
    };

    const renderRows = (parentFolders, depth = 0, visible = true) => {
        parentFolders.forEach(node => {
            const bookmarkCount = bookmarks.filter(b => b.folder_id === node.id).length;
            const children = getSortedChildren(node.id);
            const subCount = children.length;
            const hasChildren = subCount > 0;

            const tr = document.createElement('tr');
            tr.dataset.id = node.id;
            tr.dataset.parentId = node.parent_id || '';
            tr.dataset.depth = depth;
            tr.style.display = visible ? '' : 'none';
            
            // Indentation and Toggle Icon
            const indent = depth * 20;
            let nameHtml = `<div style="display:flex; align-items:center; padding-left:${indent}px;">`;
            
            if (hasChildren) {
                nameHtml += `<span class="folder-toggle collapsed" onclick="toggleCategory('${node.id}', this)" style="margin-right:5px; cursor:pointer; width:16px; text-align:center;">▶</span>`;
            } else {
                nameHtml += `<span style="width:21px;"></span>`; // Spacer
            }
            
            // Visual distinction for levels
            const iconClass = depth === 0 ? 'ri-folder-2-line' : (depth === 1 ? 'ri-folder-3-line' : 'ri-folder-line');
            const colorStyle = depth === 0 ? 'font-weight:600; color:var(--primary);' : (depth === 1 ? 'color:var(--text-primary);' : 'color:var(--text-secondary);');
            
            nameHtml += `<i class="${iconClass}" style="margin-right:5px; ${colorStyle}"></i>`;
            nameHtml += `<span style="${colorStyle}">${node.name}</span>`;
            nameHtml += `</div>`;

            tr.innerHTML = `
                <td>${nameHtml}</td>
                <td>${node.sort_order || 0}</td>
                <td>${bookmarkCount}</td>
                <td>${subCount}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editFolder('${node.id}')">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFolder('${node.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Recurse children (initially hidden if depth > 0, but here we control visibility based on parent)
            // Actually, we want default collapsed, so children are hidden
            if (hasChildren) {
                renderRows(children, depth + 1, false);
            }
        });
    };

    // Start with root folders
    const rootFolders = sortedFolders.filter(f => !f.parent_id);
    renderRows(rootFolders, 0, true);
}

// Toggle category visibility
function toggleCategory(id, toggleBtn) {
    const isCollapsed = toggleBtn.classList.contains('collapsed');
    const tbody = document.getElementById('categoriesBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Find all direct children
    const directChildren = rows.filter(r => r.dataset.parentId === id);
    
    if (isCollapsed) {
        // Expand
        toggleBtn.classList.remove('collapsed');
        toggleBtn.classList.add('expanded');
        toggleBtn.textContent = '▼';
        directChildren.forEach(r => r.style.display = '');
    } else {
        // Collapse (recursively hide all descendants)
        toggleBtn.classList.remove('expanded');
        toggleBtn.classList.add('collapsed');
        toggleBtn.textContent = '▶';
        
        const hideChildren = (parentId) => {
            const children = rows.filter(r => r.dataset.parentId === parentId);
            children.forEach(r => {
                r.style.display = 'none';
                // Reset toggle state of children if they are expanded
                const childToggle = r.querySelector('.folder-toggle');
                if (childToggle && childToggle.classList.contains('expanded')) {
                    childToggle.classList.remove('expanded');
                    childToggle.classList.add('collapsed');
                    childToggle.textContent = '▶';
                }
                hideChildren(r.dataset.id);
            });
        };
        hideChildren(id);
    }
}

// 应用分类排序
function applyCategorySort(data) {
    const sorted = [...data];
    const sortBy = document.getElementById('categorySortBy')?.value || currentCategorySortBy;
    
    switch(sortBy) {
        case 'custom':
            sorted.sort((a, b) => {
                const orderA = parseInt(a.sort_order || 0);
                const orderB = parseInt(b.sort_order || 0);
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name, 'zh-CN');
            });
            break;
        case 'name_desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
            break;
        case 'count_desc':
            sorted.sort((a, b) => {
                const countA = bookmarks.filter(bm => bm.folder_id === a.id).length;
                const countB = bookmarks.filter(bm => bm.folder_id === b.id).length;
                return countB - countA;
            });
            break;
        case 'count_asc':
            sorted.sort((a, b) => {
                const countA = bookmarks.filter(bm => bm.folder_id === a.id).length;
                const countB = bookmarks.filter(bm => bm.folder_id === b.id).length;
                return countA - countB;
            });
            break;
        case 'name_asc':
        default:
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }
    return sorted;
}

// 处理分类排序变化
function handleCategorySort() {
    const sortSelect = document.getElementById('categorySortBy');
    currentCategorySortBy = sortSelect.value;
    updateCategories();
}

// 过滤分类
function filterCategories() {
    const input = document.getElementById('categorySearch').value.toLowerCase();
    const tbody = document.getElementById('categoriesBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const categoryName = row.querySelector('td:first-child').textContent.toLowerCase();
        if (categoryName.includes(input) || input === '') {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 删除文件夹
async function deleteFolder(id) {
    if (!confirm('删除文件夹会同时删除其中的所有书签，确定吗？')) return;

    try {
        const response = await fetch('api.php?action=delete_folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert('文件夹已删除', 'success');
            loadData();
        }
    } catch (error) {
        showAlert('删除失败', 'error');
    }
}

// 编辑文件夹
function editFolder(id) {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    document.getElementById('folderName').value = folder.name;
    document.getElementById('folderDesc').value = folder.description || '';
    document.getElementById('parentFolder').value = folder.parent_id || '';
    document.getElementById('folderOrder').value = folder.sort_order || 0;
    
    document.querySelector('#addFolderModal .modal-title').textContent = '编辑文件夹';

    const form = document.getElementById('addFolderModal').querySelector('form');
    form.onsubmit = (event) => saveFolder(event, id);

    const modal = document.getElementById('addFolderModal');
    const originalOnClose = modal.querySelector('.modal-close').onclick;
    modal.querySelector('.modal-close').onclick = () => {
        form.onsubmit = (event) => saveFolder(event);
        document.querySelector('#addFolderModal .modal-title').textContent = '新建文件夹';
        document.getElementById('folderOrder').value = 0; // Reset order
        originalOnClose();
    };

    openModal('addFolderModal');
}

// 导出书签
async function exportBookmarks() {
    try {
        const response = await fetch('api.php?action=export_bookmarks');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showAlert('书签已导出', 'success');
    } catch (error) {
        showAlert('导出失败', 'error');
    }
}

// Wrapper function to be called by the new "Start Import" button
function triggerImport() {
    const fileInput = document.getElementById('importFile');
    if (fileInput.files.length === 0) {
        showAlert('请先选择一个文件', 'info');
        return;
    }
    // The event listener on the file input has already stored the file,
    // so we can now call the original handleImport function.
    handleImport();
}

// 处理导入
async function handleImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    if (!file) {
        // This case should be handled by triggerImport, but as a fallback:
        showAlert('文件丢失，请重新选择', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api.php?action=import_bookmarks', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert(`成功导入 ${data.count} 个书签`, 'success');
            document.getElementById('importResult').style.display = 'block';
            document.getElementById('importAlert').textContent = `已成功导入 ${data.count} 个书签`;
            setTimeout(() => {
                closeModal('importModal');
                loadData();
                // Reset file input and name display
                fileInput.value = '';
                document.getElementById('fileName').textContent = '未选择文件';
                document.getElementById('fileName').style.fontStyle = 'italic';
            }, 1500);
        } else {
            // Display specific error from backend
            showAlert(data.message || '导入失败', 'error');
        }
    } catch (error) {
        showAlert('导入请求失败', 'error');
    }
}

// 背景图处理
function handleBgDragOver(event) {
    event.preventDefault();
    event.target.closest('.bg-upload').classList.add('dragover');
}

function handleBgDragLeave(event) {
    event.target.closest('.bg-upload').classList.remove('dragover');
}

function handleBgDrop(event) {
    event.preventDefault();
    event.target.closest('.bg-upload').classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadBgImage(files[0]);
    }
}

function handleBgUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        uploadBgImage(files[0]);
    }
}

async function uploadBgImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api.php?action=upload_background', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.status === 'success') {
            settings.backgroundImage = data.path;
            const preview = document.getElementById('bgPreview');
            preview.style.backgroundImage = `url('${data.path}')`;
            preview.style.display = 'block';
            showAlert('背景图已上传', 'success');
        }
    } catch (error) {
        showAlert('上传失败', 'error');
    }
}

// 主题设置
function setTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/, '');
    document.body.classList.add('theme-' + theme);

    document.querySelectorAll('.theme-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.theme-item').classList.add('active');

    settings.theme = theme;
}

// 暗黑模式切换
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    settings.darkMode = document.body.classList.contains('dark-mode');
}

// 保存设置
async function saveSettings() {
    try {
        const response = await fetch('api.php?action=save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert('设置已保存', 'success');
        }
    } catch (error) {
        showAlert('保存失败', 'error');
    }
}

// 模态框控制
function openModal(modalId, lockOverlay = false) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    if (lockOverlay) {
        modal.dataset.locked = 'true';
    } else {
        delete modal.dataset.locked;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    delete modal.dataset.locked;
}

// 关闭模态框点击背景，但尊重被锁定的模态（如登录密码）
document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList && target.classList.contains('modal')) {
        // 如果存在任何正在显示且被锁定的模态，阻止通过点击背景关闭
        const lockedModal = document.querySelector('.modal.active[data-locked="true"]');
        if (lockedModal) {
            // 如果点击的正是该锁定模态的背景，也不要关闭
            return;
        }
        target.classList.remove('active');
    }
});

// 显示提示
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="ri-${type === 'success' ? 'check-double-line' : type === 'error' ? 'error-warning-line' : 'info-line'}"></i>
        <span>${message}</span>
    `;

    // 创建临时容器
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; max-width: 400px;';
        document.body.appendChild(container);
    }

    container.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// ============== CONFIG & PASSWORD LOGIC ==============

function showConfigView() {
    // Directly show the view as we are already authenticated
    switchView('config');
    loadConfig();
}

async function verifyPassword(event) {
    event.preventDefault();
    const password = document.getElementById('passwordInput').value;
    
    try {
        const response = await fetch('api.php?action=verify_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();

        if (data.status === 'success') {
            document.getElementById('passwordInput').value = '';
            initializeManager(); // Load data after successful login
        } else {
            showAlert(data.message || '密码错误', 'error');
        }
    } catch (error) {
        showAlert('验证失败', 'error');
    }
}

async function setNewPassword(event) {
    event.preventDefault();
    const password = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (password !== confirmPassword) {
        showAlert('两次输入的密码不一致', 'error');
        return;
    }
    if (password.length < 6) {
        showAlert('密码长度至少为6位', 'error');
        return;
    }

    try {
        const response = await fetch('api.php?action=set_initial_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert('密码设置成功', 'success');
            closeModal('newPasswordModal');
            initializeManager(); // Continue to load data
        } else {
            showAlert(data.message || '设置失败', 'error');
        }
    } catch (error) {
        showAlert('请求失败', 'error');
    }
}

async function loadConfig() {
    try {
        const response = await fetch('api.php?action=get_config');
        const data = await response.json();
        if (data.status === 'success' && data.config.accounts) {
            const container = document.getElementById('apiKeysContainer');
            container.innerHTML = '';
            data.config.accounts.forEach((account, index) => {
                addApiKeyRow(index, account.domain, account.api_key, account.label, true); // true indicates this is loaded from server (masked)
            });
        }
    } catch (error) {
        showAlert('加载配置失败', 'error');
    }
}

function addApiKeyRow(id = '', domain = '', apiKey = '', label = '', isServerValue = false) {
    const container = document.getElementById('apiKeysContainer');
    const div = document.createElement('div');
    div.className = 'form-group api-key-row';
    // Mark if this is a masked server value for later validation
    div.dataset.isServerValue = isServerValue ? '1' : '0';
    div.dataset.originalApiKey = isServerValue ? apiKey : ''; // Store the original masked key
    div.innerHTML = `
        <input type="text" placeholder="标签 (例如: 公司邮箱)" value="${label}" class="form-control api-key-label">
        <input type="text" placeholder="域名 (example.com)" value="${domain}" class="form-control api-key-domain">
        <input type="password" placeholder="Resend API Key" value="${apiKey}" class="form-control api-key-value" ${isServerValue ? 'title="如需修改，请输入新的API Key"' : ''}>
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="ri-delete-bin-line"></i></button>
    `;
    container.appendChild(div);
}

async function saveConfig() {
    const accounts = [];
    document.querySelectorAll('.api-key-row').forEach(row => {
        const label = row.querySelector('.api-key-label').value;
        const domain = row.querySelector('.api-key-domain').value;
        const apiKeyInput = row.querySelector('.api-key-value').value;
        const originalMaskedKey = row.dataset.originalApiKey || '';
        
        if (domain && apiKeyInput) {
            // If this is a server value and the input still equals the masked key, 
            // mark it as unchanged so backend won't overwrite
            const isUnchanged = row.dataset.isServerValue === '1' && apiKeyInput === originalMaskedKey;
            const account = { label, domain, api_key: apiKeyInput };
            if (isUnchanged) {
                account.api_key_unchanged = true; // Signal backend: keep existing key
            }
            accounts.push(account);
        }
    });

    const config = {
        accounts: accounts,
        admin_password: document.getElementById('adminPassword').value
    };

    // Filter out empty password so we don't overwrite with empty
    if (!config.admin_password) {
        delete config.admin_password;
    }

    try {
        const response = await fetch('api.php?action=save_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await response.json();

        if (data.status === 'success') {
            showAlert('配置已保存', 'success');
            document.getElementById('adminPassword').value = '';
            loadConfig(); // Reload to get fresh masked values
        } else {
            showAlert(data.message || '保存失败', 'error');
        }
    } catch (error) {
        showAlert('保存失败', 'error');
    }
}
