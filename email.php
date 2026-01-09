<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>发送邮件 - 个人导航中心</title>
    <link rel="stylesheet" href="assets/style.css">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="email-page-body">
    <div class="email-container">
        <div style="margin-bottom: 24px;">
            <a href="index.php" class="btn btn-ghost" style="padding-left: 0;">
                <i class="ri-arrow-left-line"></i> 返回导航
            </a>
        </div>

        <div class="email-card">
            <div class="email-header">
                <div class="email-header-icon">
                    <i class="ri-mail-send-line" style="font-size: 24px;"></i>
                </div>
                <h1>撰写新邮件</h1>
                <p>通过 Resend API 发送企业级邮件</p>
            </div>

            <!-- 额度仪表盘 (Compact) -->
            <div id="usageStats" class="dashboard-widget">
                <div class="widget-item">
                    <div class="widget-label">今日额度</div>
                    <div class="widget-value" id="dailyUsed">- / -</div>
                    <div class="widget-progress">
                        <div class="widget-fill" id="dailyBar" style="width: 0%"></div>
                    </div>
                </div>
                <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 20px;"></div>
                <div class="widget-item">
                    <div class="widget-label">本月额度</div>
                    <div class="widget-value" id="monthlyUsed">- / -</div>
                    <div class="widget-progress">
                        <div class="widget-fill" id="monthlyBar" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <form id="emailForm">
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">发件人身份</label>
                        <div class="input-group" style="display: flex; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                            <input type="text" id="from_name" name="from_name" class="form-control" required placeholder="例如: support" autocomplete="off" style="border: none; flex: 1;">
                            <div style="padding: 0 12px; display: flex; align-items: center; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); background: var(--slate-50); color: var(--slate-500);">@</div>
                            <select id="domain_select" name="domain_id" class="form-control" required style="border: none; flex: 1.5; background: var(--slate-50);">
                                <option value="" disabled selected>加载中...</option>
                            </select>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; color: var(--slate-500); text-align: right;">
                            预览: <span id="preview_email" style="color: var(--primary-600); font-weight: 500;">...</span>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">收件人</label>
                        <input type="email" id="to" name="to" class="form-control" required placeholder="client@example.com">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">主题</label>
                        <input type="text" id="subject" name="subject" class="form-control" required placeholder="请输入邮件主题">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">正文内容</label>
                        <textarea id="content" name="content" class="form-control" required placeholder="在此输入邮件正文..." rows="8"></textarea>
                    </div>
                </div>

                <!-- 附件区域 -->
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label">附件上传</label>
                        <div id="dropZone" class="drop-zone">
                            <i class="ri-upload-cloud-2-line"></i>
                            <div class="drop-zone-text">点击或拖拽文件到此处上传</div>
                            <input type="file" id="fileInput" multiple style="display: none;">
                        </div>
                        <div id="fileList" class="file-list"></div>
                    </div>
                </div>

                <div class="form-row" style="margin-top: 24px;">
                    <button type="submit" class="btn btn-primary" id="sendBtn" style="width: 100%; justify-content: center; padding: 12px; font-size: 16px;">
                        <i class="ri-send-plane-fill"></i> 发送邮件
                    </button>
                </div>
            </form>
            <div id="statusMessage" style="margin-top: 16px;"></div>
        </div>

        <footer class="footer">
            &copy; 2026 个人导航中心. Securely powered by Resend.
        </footer>
    </div>

    <script src="assets/email.js"></script>
</body>
</html>
