<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>个人书签导航系统</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.0.0/remixicon.min.css">
    <link rel="stylesheet" href="assets/style.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --primary: #3b82f6;
            --success: #10b981;
            --bg: #f8fafc;
            --text: #0f172a;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
        }

        .navbar {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 15px 0;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .navbar-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .navbar-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .navbar-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: #1d4ed8;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-secondary {
            background: white;
            color: var(--text);
            border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
            background: #f1f5f9;
        }

        .hero {
            max-width: 1200px;
            margin: 40px auto 60px;
            padding: 0 20px;
            text-align: center;
        }

        .hero-title {
            font-size: 40px;
            font-weight: 700;
            margin-bottom: 15px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--success) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
            font-size: 18px;
            color: #475569;
            margin-bottom: 30px;
        }

        .hero-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px 40px;
        }

        .section-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 25px;
            color: var(--text);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 25px;
            transition: all 0.3s;
            cursor: pointer;
        }

        .card:hover {
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transform: translateY(-5px);
        }

        .card-icon {
            font-size: 40px;
            margin-bottom: 15px;
            color: var(--primary);
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .card-description {
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 15px;
        }

        .card-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
        }

        .card-link:hover {
            gap: 10px;
        }

        .bookmark-container {
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }

        .bookmark-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1px;
            background: #e2e8f0;
        }

        .bookmark-item {
            background: white;
            padding: 15px;
            text-align: center;
            transition: all 0.2s;
            cursor: pointer;
        }

        .bookmark-item:hover {
            background: #f8fafc;
            transform: scale(1.05);
        }

        .bookmark-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .bookmark-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #94a3b8;
        }

        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 15px;
        }

        footer {
            text-align: center;
            padding: 20px;
            color: #94a3b8;
            font-size: 14px;
            background: white;
            border-top: 1px solid #e2e8f0;
            margin-top: 60px;
        }

        @media (max-width: 768px) {
            .hero-title {
                font-size: 28px;
            }
            .hero-actions {
                flex-direction: column;
            }
            .navbar-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <i class="ri-stack-line"></i>
                    <span>个人导航</span>
                </div>
            </div>
            <div class="sidebar-menu" id="sidebarMenu">
                <!-- Generated by JS -->
            </div>
            <div class="sidebar-footer">
                <div class="nav-item" onclick="location.href='manager.html'">
                    <i class="ri-settings-3-line"></i>
                    <span>管理后台</span>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Top Header -->
            <header class="top-header">
                <div class="header-left">
                    <button class="menu-toggle" id="menuToggle">
                        <i class="ri-menu-line"></i>
                    </button>
                    <div class="search-box">
                        <i class="ri-search-line"></i>
                        <input type="text" id="searchInput" placeholder="搜索书签...">
                    </div>
                </div>
                <div class="header-right">
                    <a href="email.php" class="header-btn email-btn-highlight" title="发送邮件">
                        <i class="ri-mail-send-line"></i>
                        <span class="btn-text">发送邮件</span>
                    </a>
                    <a href="https://github.com/HNGM-HP/Personal-navigation-site/tree/main" target="_blank" class="header-btn github-btn">
                        <i class="ri-github-fill"></i>
                        <span>GitHub</span>
                    </a>
                </div>
            </header>

            <!-- Content Body -->
            <div class="content-body" id="bookmarks-container">
                <!-- Generated by JS -->
            </div>
            
            <footer class="main-footer">
                <p>&copy; 2026 个人导航. Designed by Copilot.</p>
            </footer>
        </main>
    </div>

    <!-- Scripts -->
    <script src="assets/main.js"></script>
    <script>
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Simple search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.bookmark-card');
            cards.forEach(card => {
                const title = card.querySelector('.bookmark-title').textContent.toLowerCase();
                const desc = card.querySelector('.bookmark-desc').textContent.toLowerCase();
                if (title.includes(term) || desc.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>
