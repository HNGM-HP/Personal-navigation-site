[Uploading README.md…]()
# 邮件导航服务 - 书签管理系统

一个功能完整的书签管理系统，支持Chrome书签导入、分类管理、多主题切换和响应式设计。

## 🌟 功能特性

### 📚 书签管理
- ✅ 添加、编辑、删除书签
- ✅ 书签搜索和过滤
- ✅ 多种排序方式（按时间新旧、按标题A-Z）
- ✅ 批量删除功能
- ✅ 书签分页显示（每页20条）
- ✅ 支持标签和分类管理

### 🗂️ 分类管理
- ✅ 创建多级分类结构（无限嵌套）
- ✅ 分类排序（按名称、按书签数量）
- ✅ 分类搜索功能
- ✅ 编辑和删除分类
- ✅ 自动计算分类中的书签数量
- ✅ 分类树状展示

### 📥 导入导出
- ✅ Chrome书签HTML格式导入
- ✅ 自动识别嵌套文件夹结构（支持dt>dt嵌套）
- ✅ 支持书签导出为JSON格式
- ✅ 进度显示和导入统计

### 🎨 主题与个性化
- ✅ 5种主题色（蓝、紫、绿、红、青）
- ✅ 暗黑模式支持
- ✅ 自定义背景图片上传
- ✅ 设置持久化存储

### 📱 响应式设计
- ✅ 完全响应式布局（768px/480px断点优化）
- ✅ 移动端优化（侧边栏改为横向导航）
- ✅ 平板设备适配
- ✅ 触摸友好的界面
- ✅ 小屏幕下自动隐藏非关键列

### 🔐 安全管理
- ✅ 管理员密码保护
- ✅ 密码登录验证
- ✅ 初次使用强制设置密码
- ✅ 会话管理

### 📊 数据统计
- ✅ 仪表板统计信息
- ✅ 最近7天添加统计
- ✅ 分类统计

## 💻 技术栈

- **前端**: HTML5, CSS3, JavaScript (原生，无依赖)
- **后端**: PHP 7.0+
- **存储**: JSON文件存储
- **UI库**: RemixIcon (图标库)
- **响应式**: 自定义CSS媒体查询

## 🚀 快速开始

### 系统需求
- PHP 7.0 或以上
- 现代浏览器支持（Chrome, Firefox, Safari, Edge）
- 可写的数据目录权限

### 安装步骤

1. **克隆或下载项目**
```bash
git clone https://github.com/yourusername/email-navigation-service.git
cd email-navigation-service
```

2. **设置权限**
```bash
# Linux/Mac
chmod 755 data/
chmod 755 data/uploads

# Windows 使用文件资源管理器设置文件夹权限
```

3. **访问应用**
打开浏览器访问：`http://localhost/路径/index.html`

4. **访问管理后台**
- 点击导航栏中的"管理"按钮
- 第一次访问会要求设置管理员密码
- 输入密码后即可使用所有功能

## 📖 使用指南

### 基本操作

#### 添加书签
1. 进入"书签管理"
2. 点击"添加"按钮
3. 填写书签信息：
   - 标题：书签的显示名称
   - 链接：网址URL
   - 文件夹：选择分类
   - 分类标签：用逗号分隔多个标签
4. 点击"保存"

#### 创建分类
1. 进入"分类管理"或点击"仪表板"中的"新建文件夹"
2. 点击"新建分类"按钮
3. 输入分类信息：
   - 文件夹名称：必填
   - 父级文件夹：可选，用于创建子分类
   - 描述：可选
4. 点击"创建"

#### 导入Chrome书签
1. 在Chrome浏览器中导出书签：
   - 菜单 > 书签 > 书签管理器
   - 菜单 > 导出书签
   - 保存为HTML文件
2. 进入管理后台 > 导入
3. 选择导出的HTML文件
4. 点击"开始导入"
5. 等待导入完成（自动识别文件夹结构）

#### 排序功能

**书签排序**：
- 按时间排序（新→旧）- 最新添加的书签排在前面
- 按时间排序（旧→新）- 最早添加的书签排在前面
- 按标题（A→Z）- 按字母顺序升序
- 按标题（Z→A）- 按字母顺序降序

**分类排序**：
- 按名称（A→Z）- 分类名称升序
- 按名称（Z→A）- 分类名称降序
- 按书签数（多→少）- 书签数量降序
- 按书签数（少→多）- 书签数量升序

**搜索过滤**：
- 实时搜索书签标题、链接、标签
- 实时搜索分类名称

### 主题设置

1. 进入"主题设置"
2. 选择主题颜色：
   - 🔵 蓝色（默认）
   - 🟣 紫色
   - 🟢 绿色
   - 🔴 红色
   - 🔷 青色
3. 可选：启用暗黑模式
4. 可选：上传背景图片
   - 拖拽上传或点击选择
   - 支持JPG、PNG、WebP等格式
5. 点击"保存设置"

### 系统配置

1. 进入"系统配置"
2. 配置项：
   - **Resend API配置**：可配置多个域名和API密钥
   - **管理员密码**：修改登录密码（留空不修改）
3. 点击"保存配置"

## 📁 项目结构

```
email-navigation-service/
├── index.html                 # 主导航页面
├── manager.html               # 管理后台页面
├── api.php                    # 后端API接口
├── config.php                 # 配置文件示例
├── email.php                  # 邮件发送模块
├── assets/
│   ├── style.css             # 导航页面样式
│   ├── script.js             # 导航页面脚本
│   ├── manager.js            # 管理后台脚本（1091行）
│   └── main.js               # 公共脚本
├── data/                     # 数据存储目录
│   ├── bookmarks.json        # 书签数据
│   ├── folders.json          # 分类数据
│   ├── settings.json         # 用户设置
│   ├── config.json           # 系统配置
│   ├── usage.json            # 使用统计
│   └── uploads/              # 背景图片存储
├── tools/                    # 工具脚本
├── README.md                 # 项目文档
└── .gitignore               # Git忽略文件
```

## 🔌 API接口

### 认证接口

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `api.php?action=check_password_status` | 检查密码设置状态 |
| POST | `api.php?action=verify_password` | 验证管理员密码 |
| POST | `api.php?action=set_initial_password` | 设置初始密码 |

### 书签接口

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `api.php?action=get_all_data` | 获取所有书签和分类 |
| POST | `api.php?action=add_bookmark` | 添加书签 |
| POST | `api.php?action=update_bookmark` | 更新书签 |
| POST | `api.php?action=delete_bookmark` | 删除书签 |
| POST | `api.php?action=batch_delete_bookmarks` | 批量删除书签 |
| POST | `api.php?action=delete_uncategorized` | 删除所有未分类书签 |

### 分类接口

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `api.php?action=add_folder` | 添加分类 |
| POST | `api.php?action=update_folder` | 更新分类 |
| POST | `api.php?action=delete_folder` | 删除分类及其书签 |

### 导入导出接口

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `api.php?action=import_bookmarks` | 导入Chrome书签（支持HTML/JSON） |
| GET | `api.php?action=export_bookmarks` | 导出书签为JSON |

### 设置接口

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `api.php?action=get_settings` | 获取用户设置 |
| POST | `api.php?action=save_settings` | 保存用户设置 |
| GET | `api.php?action=get_config` | 获取系统配置 |
| POST | `api.php?action=save_config` | 保存系统配置 |
| POST | `api.php?action=upload_background` | 上传背景图片 |

### 数据格式

#### 书签对象
```json
{
  "id": "unique_id",
  "title": "Google",
  "url": "https://www.google.com",
  "folder_id": "folder_123",
  "tags": ["搜索引擎", "工具"],
  "add_date": 1673000000
}
```

#### 分类对象
```json
{
  "id": "folder_123",
  "name": "工作相关",
  "parent_id": "folder_parent",
  "description": "工作相关的网站链接",
  "created_date": 1673000000
}
```

## ⚙️ 配置说明

### settings.json（用户个性化设置）
```json
{
  "theme": "blue",
  "darkMode": false,
  "backgroundImage": "/data/uploads/bg_123456.jpg"
}
```

**主题选项**：blue, purple, green, red, teal

### config.json（系统配置）
```json
{
  "admin_password_hash": "hashed_password_string",
  "accounts": [
    {
      "label": "公司邮箱",
      "domain": "company.com",
      "api_key": "resend_api_key_here"
    }
  ]
}
```

## ❓ 常见问题

### Q: 如何重置管理员密码？
A: 
1. 手动编辑 `data/config.json`
2. 删除 `admin_password_hash` 字段
3. 重启应用，会要求重新设置密码

或者直接删除整个 `data/config.json` 文件，然后重新访问。

### Q: 导入的书签没有显示？
A: 
- 检查Chrome导出的HTML文件格式是否正确
- 使用Chrome菜单 > 书签 > 书签管理器 > 导出书签功能
- 确保file_size < 20MB

### Q: 数据在哪里存储？
A: 所有数据存储在 `data/` 目录的JSON文件中：
- `bookmarks.json` - 书签数据
- `folders.json` - 分类数据
- `settings.json` - 用户设置
- `config.json` - 系统配置

确保该目录有写权限（755权限）。

### Q: 如何修改每页显示的书签数？
A: 在 `assets/manager.js` 中修改：
```javascript
const itemsPerPage = 20;  // 改为需要的数字
```

### Q: 如何在多个服务器间同步数据？
A: 
- 定期备份 `data/` 目录
- 通过导出/导入功能转移数据
- 或使用git同步（注意不要提交敏感信息）

### Q: 支持多用户吗？
A: 目前系统只支持单个管理员用户。多用户支持在计划中。

### Q: 如何处理大量书签（>10000）？
A: 
- 分页显示已优化性能
- 建议在服务器端实现数据库存储以获得更好性能
- 考虑分离"热数据"和"冷数据"

## 🌐 浏览器兼容性

| 浏览器 | 支持情况 | 备注 |
|------|--------|------|
| Chrome/Edge | ✅ 完全支持 | 85+ 推荐 |
| Firefox | ✅ 完全支持 | 78+ 推荐 |
| Safari | ✅ 完全支持 | 13+ 推荐 |
| IE 11 | ❌ 不支持 | 不兼容ES6特性 |

## ⚡ 性能优化

- 📄 分页显示，每页最多20条记录
- ⏱️ 搜索防抖处理，延迟300ms以减少DOM操作
- 🌳 文件夹树状视图优化渲染
- 💾 缓存分类数据Map，减少重复查询
- 🖼️ 图片延迟加载和优化

## 🔒 安全建议

### 生产环境
1. **使用HTTPS**：在生产环境必须使用HTTPS
2. **强密码**：管理员密码至少8位，包含大小写字母和数字
3. **定期备份**：每周备份 `data/` 目录
4. **权限限制**：
   ```bash
   chmod 755 data/
   chmod 644 data/*.json
   chmod 600 data/config.json  # 仅所有者可读写
   ```
5. **隐藏路径**：使用非标准路径访问管理后台

### 访问控制
- 限制管理后台IP访问（.htaccess 或 nginx配置）
- 定期修改管理员密码
- 监控异常的导入活动
- 启用服务器日志记录

## 📈 性能指标

- 首屏加载时间：< 2秒
- 书签搜索响应：< 300ms
- 分类导入（1000条）：< 5秒
- 内存占用（1000条书签）：< 5MB

## 🤝 贡献指南

欢迎提交Issues和Pull Requests！

### 报告Bug
请提供：
- 浏览器版本和操作系统
- 具体的操作步骤
- 错误信息或截图
- 使用的数据规模

### 功能建议
- 描述新功能的用途
- 提供使用场景示例
- 如果可能，提供实现思路

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

Email Navigation Service Team

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**最后更新**: 2026年1月9日  
**当前版本**: 2.0.0  
**维护状态**: 📦 活跃开发中
