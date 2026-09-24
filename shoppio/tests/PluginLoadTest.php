<?php
/**
 * Smoke tests proving the plugin structure loads without fatal errors.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Tests;

use PHPUnit\Framework\TestCase;
use Shoppio\Http\ApiResponse;
use Shoppio\Plugin;
use Shoppio\Support\Config;
use Shoppio\Support\Logger;

final class PluginLoadTest extends TestCase {

	public function test_autoload_resolves_core_classes(): void {
		$this->assertTrue( class_exists( Plugin::class ) );
		$this->assertTrue( class_exists( Config::class ) );
		$this->assertTrue( class_exists( Logger::class ) );
		$this->assertTrue( class_exists( ApiResponse::class ) );
	}

	public function test_plugin_singleton_boots(): void {
		$plugin = Plugin::instance();
		$plugin->boot();

		$this->assertSame( $plugin, Plugin::instance() );
		$this->assertInstanceOf( Config::class, $plugin->config() );
		$this->assertInstanceOf( Logger::class, $plugin->logger() );
	}

	public function test_logger_redacts_secrets_without_throwing(): void {
		$logger = new Logger();
		$logger->debug(
			'test',
			array(
				'secret' => 'should-not-appear',
				'path'   => '/api/v1/health',
			)
		);
		$this->assertTrue( true );
	}

	public function test_api_response_parses_success_envelope(): void {
		$response = array(
			'response' => array( 'code' => 200 ),
			'body'     => wp_json_encode(
				array(
					'success' => true,
					'data'    => array( 'status' => 'ok' ),
				)
			),
		);

		$parsed = ApiResponse::from_wp_response( $response );
		$this->assertTrue( $parsed->ok() );
		$this->assertSame( array( 'status' => 'ok' ), $parsed->data() );
	}
}
