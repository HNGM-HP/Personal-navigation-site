<?php
// Strict types and error reporting for debugging
declare(strict_types=1);
ini_set('display_errors', '0'); // Keep this off for production feel, but we'll log errors.
error_reporting(E_ALL);

// Start session to handle authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ====== PATHS & BASIC CONFIG ======
$dataDir = __DIR__ . '/data';
$logFile = $dataDir . '/debug_log.txt';

// Clear log for new debug session if requested
if (isset($_GET['clear_log'])) {
    file_put_contents($logFile, '');
}

function log_debug(string $message): void {
    global $logFile;
    // Using print_r to handle arrays/objects gracefully
    $formatted_message = is_string($message) ? $message : print_r($message, true);
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $formatted_message . "\n", FILE_APPEND);
}

log_debug("--- Request Start ---");
log_debug("Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'N/A'));
log_debug("Request Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A'));
log_debug("Session Data at start: " . print_r($_SESSION, true));

// CRITICAL: Check if the data directory is writable
if (!is_writable($dataDir)) {
    log_debug("FATAL: Data directory '{$dataDir}' is not writable.");
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '核心错误: /data 目录不可写。请检查服务器文件权限。'], JSON_UNESCAPED_UNICODE);
    exit;
}
log_debug("Data directory is writable.");

// File paths
$bookmarkFile = $dataDir . '/bookmarks.json';
$folderFile = $dataDir . '/folders.json';
$settingsFile = $dataDir . '/settings.json';
$configFile = $dataDir . '/config.json';
$uploadsDir = $dataDir . '/uploads';
$usageFile = $dataDir . '/usage.json';

// Default limits (can be customized later)
if (!defined('LIMIT_DAILY')) define('LIMIT_DAILY', 100);
if (!defined('LIMIT_MONTHLY')) define('LIMIT_MONTHLY', 3000);

@mkdir($uploadsDir, 0755, true);

// ====== HELPER FUNCTIONS ======
function jsonResponse(array $data, int $status = 200): void {
    log_debug("Sending JSON Response (HTTP {$status}): " . json_encode($data));
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonFile(string $file): array {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    if ($content === false) return [];
    return json_decode($content, true) ?: [];
}

function writeJsonFile(string $file, array $data): bool {
    log_debug("Attempting to write to {$file}");
    if (file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        log_debug("FATAL: Failed to write to file: {$file}. Check permissions inside /data.");
        return false;
    }
    log_debug("Successfully wrote to {$file}");
    return true;
}

function generateId(): string {
    return 'id_' . uniqid() . bin2hex(random_bytes(4));
}

function getConfig(): array {
    global $configFile;
    $defaultConfig = require __DIR__ . '/config.php';
    $savedConfig = readJsonFile($configFile);
    return array_merge($defaultConfig, $savedConfig);
}

// ====== ROUTING & AUTHENTICATION ======
$action = $_GET['action'] ?? '';
log_debug("Action determined: '{$action}'");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    log_debug("Handling OPTIONS pre-flight request.");
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

$config = getConfig();
$password_is_set = isset($config['admin_password_hash']) && !empty($config['admin_password_hash']);
$is_authenticated = isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;

// --- Handle Authentication Actions First ---
if ($action === 'check_password_status') {
    log_debug("Executing action: check_password_status");
    jsonResponse(['status' => 'success', 'is_set' => $password_is_set]);
}

if ($action === 'verify_password') {
    log_debug("Executing action: verify_password");
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $password = $input['password'] ?? '';
    $hash = $config['admin_password_hash'] ?? '';
    log_debug("Hash from config for verification: " . ($hash ?: "[EMPTY]"));
    if (!empty($hash) && password_verify($password, $hash)) {
        log_debug("Password verification SUCCESSFUL.");
        $_SESSION['authenticated'] = true;
        log_debug("Session data after auth: " . print_r($_SESSION, true));
        jsonResponse(['status' => 'success']);
    } else {
        log_debug("Password verification FAILED.");
        session_destroy();
        $message = !empty($hash) ? '密码验证失败。' : '系统中未找到已保存的密码。';
        jsonResponse(['status' => 'error', 'message' => $message], 401);
    }
}

if ($action === 'set_initial_password') {
    log_debug("Executing action: set_initial_password");
    if ($password_is_set) {
        jsonResponse(['status' => 'error', 'message' => '密码已设置，无法重复初始化。'], 403);
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $password = $input['password'] ?? '';
    if (strlen($password) < 6) jsonResponse(['status' => 'error', 'message' => '密码太短'], 400);
    
    $currentConfig = readJsonFile($configFile);
    $currentConfig['admin_password_hash'] = password_hash($password, PASSWORD_DEFAULT);
    
    if (writeJsonFile($configFile, $currentConfig)) {
        $_SESSION['authenticated'] = true;
        jsonResponse(['status' => 'success']);
    } else {
        jsonResponse(['status' => 'error', 'message' => '无法保存密码，请检查 /data 目录的写入权限。'], 500);
    }
}

// --- Centralized Authentication Check for all other actions ---
$public_get_actions = ['get_settings', 'get_all_data', 'get_domains', 'get_usage']; // Publicly accessible data
// allow a small debug endpoint to be called without auth for convenience
$public_get_actions[] = 'list_uncategorized';
if ($_SERVER['REQUEST_METHOD'] === 'GET' && in_array($action, $public_get_actions)) {
    // Allow public GET requests to pass
} else {
    // All other requests (POST, DELETE, or non-public GET) require authentication if password is set
    if ($password_is_set && !$is_authenticated) {
        log_debug("AUTH FAILED: Action '{$action}' requires authentication.");
        jsonResponse(['status' => 'error', 'message' => '未授权或会话已过期，请重新登录。'], 401);
    }
}

// --- Main Action Handlers ---
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
}

switch ($action) {
    case 'get_all_data':
        $bookmarks = readJsonFile($bookmarkFile);
        $folders = readJsonFile($folderFile);
        
        // Sort folders by sort_order (ASC) then name
        usort($folders, function($a, $b) {
            $orderA = isset($a['sort_order']) ? (int)$a['sort_order'] : 0;
            $orderB = isset($b['sort_order']) ? (int)$b['sort_order'] : 0;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }
            return strcasecmp($a['name'] ?? '', $b['name'] ?? '');
        });

        // Sort bookmarks by sort_order (ASC) then add_date (DESC)
        usort($bookmarks, function($a, $b) {
            $orderA = isset($a['sort_order']) ? (int)$a['sort_order'] : 0;
            $orderB = isset($b['sort_order']) ? (int)$b['sort_order'] : 0;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }
            return ($b['add_date'] ?? 0) - ($a['add_date'] ?? 0);
        });

        jsonResponse(['status' => 'success', 'bookmarks' => $bookmarks, 'folders' => $folders]);
        break;

    case 'get_settings':
        jsonResponse(['status' => 'success', 'settings' => readJsonFile($settingsFile) ?: []]);
        break;
    
    case 'save_settings':
        if(writeJsonFile($settingsFile, $input)) {
            jsonResponse(['status' => 'success']);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法保存设置。'], 500);
        }
        break;
        
    case 'get_config':
        // Mask API keys before returning to frontend
        $accountsOut = [];
        foreach ($config['accounts'] ?? [] as $acc) {
            $copy = $acc;
            if (!empty($copy['api_key'])) {
                $k = $copy['api_key'];
                $len = strlen($k);
                if ($len <= 6) {
                    $copy['api_key'] = str_repeat('*', $len);
                } else {
                    $copy['api_key'] = substr($k, 0, 3) . str_repeat('*', max(0, $len - 7)) . substr($k, -4);
                }
            }
            $accountsOut[] = $copy;
        }
        jsonResponse(['status' => 'success', 'config' => ['accounts' => $accountsOut]]);
        break;

    case 'get_domains':
        // Return domains in a frontend-friendly shape (id = index)
        $accounts = $config['accounts'] ?? [];
        $domains = [];
        foreach ($accounts as $i => $acc) {
            $domains[] = [
                'id' => $i,
                'domain' => $acc['domain'] ?? '',
                'label' => $acc['label'] ?? ($acc['domain'] ?? '')
            ];
        }
        jsonResponse(['status' => 'success', 'domains' => $domains]);
        break;

    case 'get_usage':
        $domainId = isset($_GET['domain_id']) ? (int)$_GET['domain_id'] : 0;
        $allUsage = readJsonFile($usageFile);
        $today = date('Y-m-d');
        $month = date('Y-m');
        $daily_used = $allUsage[$domainId]['daily'][$today] ?? 0;
        $monthly_used = $allUsage[$domainId]['monthly'][$month] ?? 0;
        jsonResponse(['status' => 'success', 'daily_used' => $daily_used, 'daily_limit' => LIMIT_DAILY, 'monthly_used' => $monthly_used, 'monthly_limit' => LIMIT_MONTHLY]);
        break;

    case 'list_uncategorized':
        // Return small sample of uncategorized bookmarks for debugging (public GET)
        $all = readJsonFile($bookmarkFile);
        $unc = array_values(array_filter($all, function($b) { return empty($b['folder_id']); }));
        // return only first 200 for safety
        $sample = array_slice($unc, 0, 200);
        jsonResponse(['status' => 'success', 'count' => count($unc), 'sample' => $sample]);
        break;

    case 'save_config':
        $savedConfig = readJsonFile($configFile);
        if (!isset($savedConfig['accounts'])) $savedConfig['accounts'] = [];
        if (isset($input['accounts'])) {
            // Merge accounts; if marked as unchanged or contains *, keep existing key
            foreach ($input['accounts'] as $i => $incAcc) {
                $existing = $savedConfig['accounts'][$i] ?? [];
                $merged = $existing;
                $merged['domain'] = $incAcc['domain'] ?? ($existing['domain'] ?? '');
                $merged['label'] = $incAcc['label'] ?? ($existing['label'] ?? '');
                
                // Check if this account's API key should be kept unchanged
                if (isset($incAcc['api_key'])) {
                    // If marked as unchanged OR contains '*' (masked), keep existing key
                    if (($incAcc['api_key_unchanged'] ?? false) || strpos($incAcc['api_key'], '*') !== false) {
                        // Keep existing API key
                        if (isset($existing['api_key'])) {
                            $merged['api_key'] = $existing['api_key'];
                        }
                    } else if (trim($incAcc['api_key']) !== '') {
                        // New API key provided, update it
                        $merged['api_key'] = $incAcc['api_key'];
                    }
                }
                $savedConfig['accounts'][$i] = $merged;
            }
        }
        if (!empty($input['admin_password'])) {
            $savedConfig['admin_password_hash'] = password_hash($input['admin_password'], PASSWORD_DEFAULT);
        }
        if (writeJsonFile($configFile, $savedConfig)) {
            jsonResponse(['status' => 'success']);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法保存配置。'], 500);
        }
        break;

    case 'import_bookmarks':
        log_debug("Executing action: import_bookmarks");
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            log_debug('No uploaded file or upload error');
            jsonResponse(['status' => 'error', 'message' => '未接收到文件或上传失败。'], 400);
        }

        $uploaded = $_FILES['file'];
        $content = file_get_contents($uploaded['tmp_name']);
        if ($content === false) {
            log_debug('Failed to read uploaded file');
            jsonResponse(['status' => 'error', 'message' => '无法读取上传的文件。'], 500);
        }

        $existing = readJsonFile($bookmarkFile);
        $importedCount = 0;

        // Try JSON first
        $maybeJson = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($maybeJson)) {
            foreach ($maybeJson as $item) {
                if (empty($item['url'])) continue;
                $existing[] = [
                    'id' => generateId(),
                    'title' => $item['title'] ?? $item['name'] ?? $item['url'],
                    'url' => $item['url'],
                    'folder_id' => $item['folder_id'] ?? '',
                    'tags' => $item['tags'] ?? [],
                    'add_date' => time()
                ];
                $importedCount++;
            }
        } else {
            // Parse as HTML (Chrome bookmark format)
            libxml_use_internal_errors(true);
            $dom = new DOMDocument();
            if (@$dom->loadHTML($content, LIBXML_NOWARNING | LIBXML_NOERROR)) {
                $xpath = new DOMXPath($dom);
                $folders = readJsonFile($folderFile);
                $processedUrls = [];
                foreach ($existing as $bm) {
                    $processedUrls[$bm['url'] ?? ''] = true;
                }

                // Create or reuse folder: match by (name, parent_id) pair
                $createFolder = function($name, $parentId = '') use (&$folders) {
                    $nm = trim($name);
                    foreach ($folders as $f) {
                        if (($f['name'] ?? '') === $nm && (($f['parent_id'] ?? '') === ($parentId ?? ''))) {
                            return $f['id'];
                        }
                    }
                    $folder = ['id' => generateId(), 'name' => $nm, 'parent_id' => $parentId, 'created_date' => time()];
                    $folders[] = $folder;
                    log_debug("Created folder: {$nm} (parent: {$parentId})");
                    return $folder['id'];
                };

                // === Chrome Bookmark Parser (Recursive DOM Tree) ===
                // Strategy: Recursive traversal to handle nested DL/DT structures correctly.
                
                $processNode = null;
                $processNode = function($node, $currentFolderId) use (&$processNode, &$createFolder, &$existing, &$processedUrls, &$importedCount) {
                    $localPending = null;
                    
                    if (!$node->childNodes) return null;

                    foreach ($node->childNodes as $child) {
                        if ($child->nodeType !== XML_ELEMENT_NODE) continue;
                        
                        $tagName = strtoupper($child->nodeName);
                        
                        if ($tagName === 'H3') {
                            $folderName = trim($child->nodeValue);
                            if ($folderName !== '') {
                                $localPending = $createFolder($folderName, $currentFolderId);
                            }
                        } elseif ($tagName === 'A') {
                            $href = trim($child->getAttribute('href'));
                            if (!empty($href) && !isset($processedUrls[$href])) {
                                $title = trim($child->nodeValue) ?: $href;
                                $existing[] = [
                                    'id' => generateId(),
                                    'title' => $title,
                                    'url' => $href,
                                    'folder_id' => $currentFolderId,
                                    'tags' => [],
                                    'add_date' => time()
                                ];
                                $processedUrls[$href] = true;
                                $importedCount++;
                                log_debug("Bookmark: {$title} -> folder ID: {$currentFolderId}");
                            }
                        } elseif ($tagName === 'DL') {
                            // DL consumes the pending folder if available, otherwise belongs to current
                            $context = $localPending ? $localPending : $currentFolderId;
                            $processNode($child, $context);
                            $localPending = null; // Consumed
                        } elseif ($tagName === 'DT' || $tagName === 'P' || $tagName === 'BODY' || $tagName === 'HTML') {
                            // Recurse into containers
                            $returnedPending = $processNode($child, $currentFolderId);
                            if ($returnedPending) {
                                $localPending = $returnedPending;
                            }
                        }
                    }
                    
                    return $localPending;
                };

                // Start parsing from root DLs
                $rootDLs = $xpath->query('//body/dl');
                if ($rootDLs->length > 0) {
                    $processNode($rootDLs->item(0), '');
                } else {
                    // Fallback: try any DL
                    $dls = $dom->getElementsByTagName('dl');
                    if ($dls->length > 0) {
                        $processNode($dls->item(0), '');
                    }
                }

                writeJsonFile($folderFile, $folders);
            } else {
                log_debug('HTML parsing failed for import file');
                jsonResponse(['status' => 'error', 'message' => '无法解析上传的文件。'], 400);
            }
        }

        if ($importedCount === 0) {
            jsonResponse(['status' => 'error', 'message' => '未找到可导入的书签。'], 400);
        }

        if (writeJsonFile($bookmarkFile, $existing)) {
            log_debug("Imported {$importedCount} bookmarks successfully");
            jsonResponse(['status' => 'success', 'count' => $importedCount]);
        } else {
            jsonResponse(['status' => 'error', 'message' => '保存书签失败。'], 500);
        }
        break;

    case 'dedupe_folders':
        log_debug('Executing action: dedupe_folders');
        $folders = readJsonFile($folderFile);
        $bookmarksData = readJsonFile($bookmarkFile);

        // Build map by normalized name
        $map = [];
        foreach ($folders as $f) {
            $key = mb_strtolower(trim($f['name'] ?? ''));
            if (!isset($map[$key])) $map[$key] = [];
            $map[$key][] = $f;
        }

        $merged = 0;
        foreach ($map as $key => $group) {
            if (count($group) <= 1) continue;
            // choose the earliest created as canonical
            usort($group, function($a, $b) { return ($a['created_date'] ?? 0) <=> ($b['created_date'] ?? 0); });
            $canonical = array_shift($group);
            $canonicalId = $canonical['id'];

            foreach ($group as $dup) {
                $dupId = $dup['id'];
                // reassign bookmarks
                foreach ($bookmarksData as &$bm) {
                    if (($bm['folder_id'] ?? '') === $dupId) $bm['folder_id'] = $canonicalId;
                }
                // remove duplicate folder
                foreach ($folders as $idx => $ff) {
                    if ($ff['id'] === $dupId) {
                        array_splice($folders, $idx, 1);
                        break;
                    }
                }
                $merged++;
            }
        }

        // persist changes
        writeJsonFile($folderFile, $folders);
        writeJsonFile($bookmarkFile, $bookmarksData);

        jsonResponse(['status' => 'success', 'merged' => $merged]);
        break;

    case 'delete_uncategorized':
        log_debug('Executing action: delete_uncategorized');
        $bookmarksData = readJsonFile($bookmarkFile);
        $before = count($bookmarksData);
        $bookmarksData = array_values(array_filter($bookmarksData, function($b) { return !empty($b['folder_id']); }));
        $after = count($bookmarksData);
        $deleted = $before - $after;
        if (writeJsonFile($bookmarkFile, $bookmarksData)) {
            jsonResponse(['status' => 'success', 'deleted' => $deleted]);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法保存书签文件。'], 500);
        }
        break;

    case 'add_bookmark':
    case 'update_bookmark':
        // Logic for both adding and updating bookmarks
        $bookmarks = readJsonFile($bookmarkFile);
        $is_update = ($action === 'update_bookmark');
        $id = $input['id'] ?? null;
        
        if ($is_update) {
            if (!$id) jsonResponse(['status' => 'error', 'message' => '缺少ID'], 400);
            $found = false;
            foreach ($bookmarks as &$b) {
                if ($b['id'] === $id) {
                    $b['title'] = $input['title'] ?? $b['title'];
                    $b['url'] = $input['url'] ?? $b['url'];
                    $b['folder_id'] = $input['folder_id'] ?? $b['folder_id'];
                    $b['tags'] = $input['tags'] ?? $b['tags'];
                    if (isset($input['sort_order'])) {
                        $b['sort_order'] = (int)$input['sort_order'];
                    }
                    $found = true;
                    break;
                }
            }
            if (!$found) jsonResponse(['status' => 'error', 'message' => '未找到书签'], 404);
        } else {
            if (empty($input['title']) || empty($input['url'])) jsonResponse(['status' => 'error', 'message' => '标题和链接不能为空'], 400);
            $bookmarks[] = [
                'id' => generateId(), 
                'title' => $input['title'], 
                'url' => $input['url'], 
                'folder_id' => $input['folder_id'] ?? '', 
                'tags' => $input['tags'] ?? [], 
                'add_date' => time(),
                'sort_order' => isset($input['sort_order']) ? (int)$input['sort_order'] : 0
            ];
        }
        
        if (writeJsonFile($bookmarkFile, $bookmarks)) {
            jsonResponse(['status' => 'success']);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法保存书签。'], 500);
        }
        break;

    case 'delete_bookmark':
        $bookmarks = readJsonFile($bookmarkFile);
        $bookmarks = array_values(array_filter($bookmarks, fn($b) => $b['id'] !== ($input['id'] ?? '')));
        if (writeJsonFile($bookmarkFile, $bookmarks)) {
            jsonResponse(['status' => 'success']);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法删除书签。'], 500);
        }
        break;

    // ==================== 分类管理 ====================
    case 'add_folder':
        $folders = readJsonFile($folderFile);
        $folder = [
            'id' => generateId(), 
            'name' => $input['name'] ?? '', 
            'parent_id' => $input['parent_id'] ?? '', 
            'created_date' => time(),
            'sort_order' => isset($input['sort_order']) ? (int)$input['sort_order'] : 0
        ];
        if (empty($folder['name'])) jsonResponse(['status' => 'error', 'message' => '名称不能为空'], 400);
        $folders[] = $folder;
        if (writeJsonFile($folderFile, $folders)) {
            jsonResponse(['status' => 'success', 'data' => $folder]);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法添加分类，请检查文件权限。'], 500);
        }
        break;
    
    case 'update_folder':
        $folders = readJsonFile($folderFile);
        $folderId = $input['id'] ?? '';
        $folderName = $input['name'] ?? '';
        $folderParentId = $input['parent_id'] ?? '';
        $folderDesc = $input['description'] ?? '';
        $folderOrder = isset($input['sort_order']) ? (int)$input['sort_order'] : null;
        
        if (empty($folderId) || empty($folderName)) {
            jsonResponse(['status' => 'error', 'message' => '缺少必要参数'], 400);
        }
        
        // 查找分类
        $folderIndex = -1;
        foreach ($folders as $index => $folder) {
            if ($folder['id'] === $folderId) {
                $folderIndex = $index;
                break;
            }
        }
        
        if ($folderIndex === -1) {
            jsonResponse(['status' => 'error', 'message' => '分类不存在'], 404);
        }
        
        // 检查父分类是否存在且不是当前分类的子分类
        if ($folderParentId) {
            // 防止循环嵌套
            function checkParentLoop($folders, $parentId, $currentId) {
                if ($parentId === $currentId) return true;
                $parentFolder = array_filter($folders, function($f) use ($parentId) { return $f['id'] === $parentId; });
                $parentFolder = reset($parentFolder);
                if (!$parentFolder) return false;
                if ($parentFolder['parent_id'] === $currentId) return true;
                if ($parentFolder['parent_id']) {
                    return checkParentLoop($folders, $parentFolder['parent_id'], $currentId);
                }
                return false;
            }
            
            if (checkParentLoop($folders, $folderParentId, $folderId)) {
                jsonResponse(['status' => 'error', 'message' => '不能将分类设置为自身或子分类的子分类'], 400);
            }
        }
        
        // 更新分类
        $folders[$folderIndex]['name'] = $folderName;
        $folders[$folderIndex]['parent_id'] = $folderParentId;
        $folders[$folderIndex]['description'] = $folderDesc;
        if ($folderOrder !== null) {
            $folders[$folderIndex]['sort_order'] = $folderOrder;
        }
        
        if (writeJsonFile($folderFile, $folders)) {
            jsonResponse(['status' => 'success', 'data' => $folders[$folderIndex]]);
        } else {
            jsonResponse(['status' => 'error', 'message' => '无法更新分类，请检查文件权限。'], 500);
        }
        break;

    case 'delete_folder':
        $folders = readJsonFile($folderFile);
        $bookmarks = readJsonFile($bookmarkFile);
        $folderId = $input['id'] ?? '';
        
        // 递归删除子分类
        function deleteChildFolders(&$folders, $parentId, &$bookmarks) {
            $childFolders = array_filter($folders, function($f) use ($parentId) { return $f['parent_id'] === $parentId; });
            foreach ($childFolders as $child) {
                // 递归删除子分类的子分类
                deleteChildFolders($folders, $child['id'], $bookmarks);
                
                // 将子分类下的书签移至未分类
                foreach ($bookmarks as &$b) {
                    if ($b['folder_id'] === $child['id']) $b['folder_id'] = '';
                }
            }
            
            // 删除所有子分类
            $folders = array_filter($folders, function($f) use ($parentId) { return $f['parent_id'] !== $parentId; });
        }
        
        // 删除子分类
        deleteChildFolders($folders, $folderId, $bookmarks);
        
        // 将当前分类下的书签移至未分类
        foreach ($bookmarks as &$b) {
            if ($b['folder_id'] === $folderId) $b['folder_id'] = '';
        }
        
        // 删除当前分类
        $folders = array_filter($folders, function($f) use ($folderId) { return $f['id'] !== $folderId; });
        
        writeJsonFile($folderFile, array_values($folders));
        writeJsonFile($bookmarkFile, $bookmarks);
        jsonResponse(['status' => 'success', 'message' => '分类已删除']);
        break;

    // ==================== 邮件发送功能 ====================
    case 'send_email':
        $config = getConfig();
        $inputRaw = file_get_contents('php://input');
        $input = json_decode($inputRaw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            parse_str($inputRaw, $parsedData);
            $input = $parsedData;
        }

        $attachments = $input['attachments'] ?? [];
        
        $to = $input['to'] ?? '';
        $subject = $input['subject'] ?? '';
        $html = $input['html'] ?? '';
        $text = $input['text'] ?? '';
        $fromName = $input['from_name'] ?? '';
        $domainId = $input['domain_id'] ?? 0;

        if (!isset($config['accounts'][$domainId])) {
            jsonResponse(['success' => false, 'message' => '无效的域名配置'], 400);
        }

        // 额度检查
        $allUsage = readJsonFile($usageFile);
        if (!isset($allUsage[$domainId])) $allUsage[$domainId] = ['daily' => [], 'monthly' => []];
        $today = date('Y-m-d');
        $month = date('Y-m');
        
        if (($allUsage[$domainId]['daily'][$today] ?? 0) >= LIMIT_DAILY) jsonResponse(['success' => false, 'message' => '日限额已满'], 403);
        if (($allUsage[$domainId]['monthly'][$month] ?? 0) >= LIMIT_MONTHLY) jsonResponse(['success' => false, 'message' => '月限额已满'], 403);

        $selectedAccount = $config['accounts'][$domainId];
        $apiKey = $selectedAccount['api_key'];
        $domain = $selectedAccount['domain'];

        if (empty($apiKey)) {
            jsonResponse(['success' => false, 'message' => 'Resend API Key 未配置'], 500);
        }
        
        $postData = [
            'from' => "$fromName <$fromName@$domain>",
            'to' => [$to],
            'subject' => $subject,
            'html' => $html,
            'text' => $text
        ];

        if (!empty($attachments)) {
            $postData['attachments'] = [];
            foreach ($attachments as $att) {
                $postData['attachments'][] = ['filename' => $att['filename'], 'content' => $att['content']];
            }
        }

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            // 增加额度
            $allUsage[$domainId]['daily'][$today] = ($allUsage[$domainId]['daily'][$today] ?? 0) + 1;
            $allUsage[$domainId]['monthly'][$month] = ($allUsage[$domainId]['monthly'][$month] ?? 0) + 1;
            writeJsonFile($usageFile, $allUsage);
            
            jsonResponse(['success' => true]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Resend API Error: ' . $response], $httpCode);
        }
        break;
    
    default:
        log_debug("Action '{$action}' not found.");
        jsonResponse(['status' => 'error', 'message' => '未知操作'], 404);
}

// --- END OF REQUEST ---
log_debug("--- Request End ---");
log_debug("Session Data at end: " . print_r($_SESSION, true));
?>