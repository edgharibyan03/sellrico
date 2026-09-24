<?php
/**
 * Plain PHP smoke test (no PHPUnit required).
 * Run: php tests/smoke.php
 *
 * @package Shoppio
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$failures = 0;

function smoke_assert(bool $condition, string $message): void {
	global $failures;
	if ( $condition ) {
		echo "OK  {$message}\n";
		return;
	}
	++$failures;
	echo "FAIL {$message}\n";
}

smoke_assert( class_exists( \Shoppio\Plugin::class ), 'Plugin class autoloads' );
smoke_assert( class_exists( \Shoppio\Support\Config::class ), 'Config class autoloads' );
smoke_assert( class_exists( \Shoppio\Support\Logger::class ), 'Logger class autoloads' );
smoke_assert( class_exists( \Shoppio\Http\ApiClient::class ), 'ApiClient class autoloads' );
smoke_assert( class_exists( \Shoppio\Http\ApiResponse::class ), 'ApiResponse class autoloads' );
smoke_assert( class_exists( \Shoppio\Auth\ConnectionManager::class ), 'ConnectionManager class autoloads' );

$plugin = \Shoppio\Plugin::instance();
$plugin->boot();
smoke_assert( $plugin === \Shoppio\Plugin::instance(), 'Plugin singleton is stable' );

$response = \Shoppio\Http\ApiResponse::from_wp_response(
	array(
		'response' => array( 'code' => 200 ),
		'body'     => wp_json_encode(
			array(
				'success' => true,
				'data'    => array( 'status' => 'ok' ),
			)
		),
	)
);
smoke_assert( $response->ok(), 'ApiResponse parses success envelope' );
smoke_assert( is_array( $response->data() ) && ( $response->data()['status'] ?? null ) === 'ok', 'ApiResponse data payload' );

if ( $failures > 0 ) {
	fwrite( STDERR, "\n{$failures} smoke assertion(s) failed.\n" );
	exit( 1 );
}

echo "\nAll smoke assertions passed.\n";
exit( 0 );
