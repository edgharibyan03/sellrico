<?php
/**
 * Plugin activation.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Support;

final class Activator {

	public static function activate(): void {
		if ( ! get_option( 'shoppio_connection_status' ) ) {
			add_option( 'shoppio_connection_status', 'disconnected', '', false );
		}

		if ( ! get_option( 'shoppio_api_url' ) ) {
			add_option( 'shoppio_api_url', '', '', false );
		}

		flush_rewrite_rules();
	}
}
