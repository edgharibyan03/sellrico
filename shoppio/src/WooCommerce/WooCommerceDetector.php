<?php
/**
 * Detects WooCommerce availability for future integration.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\WooCommerce;

use Shoppio\Support\Logger;

final class WooCommerceDetector {

	private Logger $logger;

	public function __construct( Logger $logger ) {
		$this->logger = $logger;
	}

	public function register(): void {
		add_action( 'plugins_loaded', array( $this, 'detect' ), 20 );
	}

	public function detect(): void {
		if ( $this->is_active() ) {
			$this->logger->debug( 'WooCommerce detected' );
		}
	}

	public function is_active(): bool {
		return class_exists( 'WooCommerce' );
	}
}
