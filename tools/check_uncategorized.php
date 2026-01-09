<?php
$base = __DIR__ . '/../data';
$bookmarksFile = $base . '/bookmarks.json';
$foldersFile = $base . '/folders.json';
$bookmarks = json_decode(file_get_contents($bookmarksFile), true);
$folders = json_decode(file_get_contents($foldersFile), true);
$folderIds = [];
foreach ($folders as $f) {
    if (isset($f['id'])) $folderIds[$f['id']] = $f;
}
$uncategorized = [];
foreach ($bookmarks as $b) {
    $fid = isset($b['folder_id']) ? $b['folder_id'] : '';
    if (empty($fid) || !isset($folderIds[$fid])) {
        $uncategorized[] = [
            'id' => $b['id'] ?? null,
            'title' => $b['title'] ?? null,
            'url' => $b['url'] ?? null,
            'folder_id' => $fid
        ];
    }
}
$out = [
    'total_bookmarks' => count($bookmarks),
    'folders_count' => count($folders),
    'uncategorized_count' => count($uncategorized),
    'sample' => array_slice($uncategorized, 0, 200),
];
echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
