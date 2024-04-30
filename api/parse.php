<?php

require_once __DIR__ . '/../vendor/autoload.php';

use PhpParser\ParserFactory;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$data = file_get_contents('php://input');
$code = json_decode($data, true)['code'];
header('Content-Type: application/json');

define('MAX_BUFFER_SIZE_FOR_PHP_BINARY_OUTPUT', 10 * 1024 * 1024);
define('DYNAMIC', 'force-dynamic');

$parser = (new ParserFactory())->createForHostVersion();

try {
    $stmts = $parser->parse($code);

    $result = json_encode($stmts, JSON_PRETTY_PRINT);

    echo json_encode([
        'result' => $result
    ]);
} catch (PhpParser\Error $e) {
    echo json_encode([
        'error' => 'Parse Error: ', $e->getMessage()
    ]);
}
