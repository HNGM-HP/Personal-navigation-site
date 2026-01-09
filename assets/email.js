let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    initEmailPage();
});

async function initEmailPage() {
    await loadDomains();
    setupEventListeners();
}

async function loadDomains() {
    const select = document.getElementById('domain_select');
    try {
        const response = await fetch('api.php?action=get_domains');
        const json = await response.json();
        const domains = Array.isArray(json) ? json : (json.domains || []);

        if (domains && domains.length > 0) {
            select.innerHTML = '<option value="" disabled selected>请选择发件域名</option>';
            domains.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.label || d.domain;
                opt.dataset.domain = d.domain || '';
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="" disabled selected>未配置发件域名</option>';
        }
    } catch (error) {
        console.error('加载域名失败:', error);
        select.innerHTML = '<option value="" disabled selected>加载失败</option>';
    }
}

function setupEventListeners() {
    const domainSelect = document.getElementById('domain_select');
    const fromNameInput = document.getElementById('from_name');
    
    domainSelect.addEventListener('change', () => {
        updateUsageStats();
        updatePreviewEmail();
    });

    fromNameInput.addEventListener('input', updatePreviewEmail);

    // File Upload Listeners
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-500)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border-color)';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    // Form submission
    document.getElementById('emailForm').addEventListener('submit', sendEmail);
}

async function updateUsageStats() {
    const domainId = document.getElementById('domain_select').value;
    if (!domainId) return;

    try {
        const response = await fetch(`api.php?action=get_usage&domain_id=${domainId}`);
        const json = await response.json();
        const usage = (json && json.status) ? json : json; // keep backward compatible

        const daily_used = usage.daily_used ?? 0;
        const daily_limit = usage.daily_limit ?? 0;
        const monthly_used = usage.monthly_used ?? 0;
        const monthly_limit = usage.monthly_limit ?? 0;

        document.getElementById('dailyUsed').textContent = `${daily_used} / ${daily_limit}`;
        document.getElementById('monthlyUsed').textContent = `${monthly_used} / ${monthly_limit}`;

        const dailyPercent = daily_limit ? (daily_used / daily_limit) * 100 : 0;
        const monthlyPercent = monthly_limit ? (monthly_used / monthly_limit) * 100 : 0;

        document.getElementById('dailyBar').style.width = `${dailyPercent}%`;
        document.getElementById('monthlyBar').style.width = `${monthlyPercent}%`;
    } catch (error) {
        console.error('获取额度失败:', error);
    }
}

function updatePreviewEmail() {
    const fromName = document.getElementById('from_name').value.trim();
    const select = document.getElementById('domain_select');
    const selectedOption = select.options[select.selectedIndex];
    
    if (fromName && selectedOption && selectedOption.dataset.domain) {
        document.getElementById('preview_email').textContent = `${fromName}@${selectedOption.dataset.domain}`;
    } else {
        document.getElementById('preview_email').textContent = '...';
    }
}

function handleFiles(files) {
    for (const file of files) {
        // Prevent duplicates
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    }
    renderFileList();
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="file-name">${file.name} (${(file.size / 1024).toFixed(2)} KB)</span>
            <span class="file-remove" onclick="removeFile(${index})">&times;</span>
        `;
        fileList.appendChild(item);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

async function sendEmail(event) {
    event.preventDefault();
    const btn = document.getElementById('sendBtn');
    const status = document.getElementById('statusMessage');
    const form = event.target;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 发送中...';
    status.textContent = '';

    const attachments = [];
    for (const file of selectedFiles) {
        const content = await fileToBase64(file);
        attachments.push({
            filename: file.name,
            content: content.split(',')[1] // Get base64 part
        });
    }

    const data = {
        to: form.to.value,
        subject: form.subject.value,
        html: form.content.value,
        text: form.content.value.replace(/<[^>]*>/g, ''), // Basic text version
        from_name: form.from_name.value,
        domain_id: form.domain_id.value,
        attachments: attachments
    };

    try {
        const response = await fetch('api.php?action=send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            status.style.color = 'var(--success-500)';
            status.textContent = '✅ 邮件已成功发送！';
            form.reset();
            selectedFiles = [];
            renderFileList();
            updateUsageStats();
            updatePreviewEmail();
        } else {
            throw new Error(result.message || '未知错误');
        }
    } catch (error) {
        status.style.color = 'var(--danger-500)';
        status.textContent = '❌ 发送失败: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-send-plane-fill"></i> 发送邮件';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
