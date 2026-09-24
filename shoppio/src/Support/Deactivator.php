<?php
/**
 * Plugin deactivation.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Support;

final class Deactivator {

	public static function deactivate(): void {
		delete_transient( 'shoppio_access_token' );
		flush_rewrite_rules();
	}
}
