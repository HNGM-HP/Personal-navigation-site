<?php
// Repair import: re-map bookmarks to folders based on exported HTML structure
// Usage: open in browser: tools/repair_import.php?file=../data/bookmarks_2026_1_7.html

ini_set('display_errors', 1);
error_reporting(E_ALL);

$file = isset($_GET['file']) ? $_GET['file'] : __DIR__ . '/../data/bookmarks_2026_1_7.html';

if (!file_exists($file)) {
    echo json_encode(['status' => 'error', 'message' => 'HTML file not found: ' . $file]);
    exit;
}

$foldersPath = __DIR__ . '/../data/folders.json';
$bookmarksPath = __DIR__ . '/../data/bookmarks.json';

$folders = file_exists($foldersPath) ? json_decode(file_get_contents($foldersPath), true) : [];
$bookmarks = file_exists($bookmarksPath) ? json_decode(file_get_contents($bookmarksPath), true) : [];

function save_json($path, $data) {
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// helper: find or create folder by name + parent
function find_or_create_folder(&$folders, $name, $parent_id) {
    foreach ($folders as $f) {
        if ($f['name'] === $name && ($f['parent_id'] ?? '') === ($parent_id ?? '')) {
            return $f['id'];
        }
    }
    // create
    $id = 'id_' . bin2hex(random_bytes(8));
    $folders[] = [
        'id' => $id,
        'name' => $name,
        'parent_id' => $parent_id ?? '',
        'created_date' => time()
    ];
    return $id;
}

$doc = new DOMDocument();
libxml_use_internal_errors(true);
$doc->loadHTMLFile($file, LIBXML_NOERROR | LIBXML_NOWARNING);
libxml_clear_errors();

$xpath = new DOMXPath($doc);

$created_folders = 0;
$updated_bookmarks = 0;
$not_found = [];

// parse DL recursively and maintain current folder path
function parseNode($node, &$folders, &$bookmarks, $parent_folder_id, $xpath, &$created_folders, &$updated_bookmarks, &$not_found) {
    foreach ($node->childNodes as $child) {
        if ($child->nodeName === 'DT') {
            // H3 folder
            $h3 = null;
            foreach ($child->childNodes as $dch) {
                if ($dch->nodeName === 'H3') { $h3 = $dch; break; }
            }
            if ($h3) {
                $folderName = trim($h3->textContent);
                $folderId = find_or_create_folder($folders, $folderName, $parent_folder_id);
                // count if newly created (approx by checking created_date near now)
                $created_folders++;
                // find following DL sibling for children
                $sibling = $child->nextSibling;
                while ($sibling && strtolower($sibling->nodeName) !== 'dl') { $sibling = $sibling->nextSibling; }
                if ($sibling) parseNode($sibling, $folders, $bookmarks, $folderId, $xpath, $created_folders, $updated_bookmarks, $not_found);
            } else {
                // Anchor
                foreach ($child->getElementsByTagName('A') as $a) {
                    $url = trim($a->getAttribute('HREF')) ?: trim($a->getAttribute('href'));
                    $title = trim($a->textContent);
                    if (!$url) continue;
                    // try find in bookmarks by url or title
                    $found = false;
                    foreach ($bookmarks as &$bm) {
                        if ($bm['url'] === $url || $bm['title'] === $title) {
                            $bm['folder_id'] = $parent_folder_id;
                            $updated_bookmarks++;
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) $not_found[] = ['title' => $title, 'url' => $url, 'target_folder' => $parent_folder_id];
                }
            }
        } elseif ($child->nodeName === 'DL') {
            parseNode($child, $folders, $bookmarks, $parent_folder_id, $xpath, $created_folders, $updated_bookmarks, $not_found);
        }
    }
}

$body = $doc->getElementsByTagName('body')->item(0);
if (!$body) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid HTML, no body']);
    exit;
}

// Find top-level DL
$topDL = null;
foreach ($body->getElementsByTagName('dl') as $dl) { $topDL = $dl; break; }
if (!$topDL) {
    echo json_encode(['status' => 'error', 'message' => 'No DL found in bookmarks HTML']);
    exit;
}

parseNode($topDL, $folders, $bookmarks, '', $xpath, $created_folders, $updated_bookmarks, $not_found);

// Save back
save_json($foldersPath, $folders);
save_json($bookmarksPath, $bookmarks);

echo json_encode([
    'status' => 'success',
    'created_folders' => $created_folders,
    'updated_bookmarks' => $updated_bookmarks,
    'not_found_count' => count($not_found),
    'not_found_sample' => array_slice($not_found, 0, 20)
], JSON_UNESCAPED_UNICODE);

?>
