<?php
/**
 * Schedules catalog sync when WooCommerce products change.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\WooCommerce;

use Shoppio\Support\Config;
use Shoppio\Support\Logger;

final class ProductChangeWatcher {

	private const HOOK = 'shoppio_run_product_sync';
	private const DEBOUNCE_SECONDS = 20;

	private Config $config;
	private Logger $logger;
	private ProductSyncer $syncer;

	public function __construct( Config $config, Logger $logger, ProductSyncer $syncer ) {
		$this->config = $config;
		$this->logger = $logger;
		$this->syncer = $syncer;
	}

	public function register(): void {
		add_action( self::HOOK, array( $this, 'run_scheduled_sync' ) );

		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		add_action( 'woocommerce_new_product', array( $this, 'schedule_sync' ), 20 );
		add_action( 'woocommerce_update_product', array( $this, 'schedule_sync' ), 20 );
		add_action( 'woocommerce_trash_product', array( $this, 'schedule_sync' ), 20 );
		add_action( 'woocommerce_before_delete_product', array( $this, 'schedule_sync' ), 20 );
		add_action( 'untrashed_post', array( $this, 'maybe_schedule_from_post' ), 20 );
	}

	/**
	 * @param int|string $product_id Product ID from WooCommerce hooks.
	 */
	public function schedule_sync( $product_id = 0 ): void {
		unset( $product_id );
		$this->queue_debounced_sync();
	}

	/**
	 * @param int $post_id Post ID.
	 */
	public function maybe_schedule_from_post( int $post_id ): void {
		if ( 'product' !== get_post_type( $post_id ) ) {
			return;
		}
		$this->queue_debounced_sync();
	}

	public function run_scheduled_sync(): void {
		if ( ! $this->config->is_connected() ) {
			return;
		}

		$result = $this->syncer->sync();
		if ( ! $result['success'] ) {
			$this->logger->error( 'Scheduled product sync failed', array( 'message' => $result['message'] ) );
			return;
		}

		$this->logger->info( 'Scheduled product sync completed', array( 'total' => $result['total'] ?? null ) );
	}

	private function queue_debounced_sync(): void {
		if ( ! $this->config->is_connected() ) {
			return;
		}

		$timestamp = time() + self::DEBOUNCE_SECONDS;

		// Collapse bursts of product edits into one sync.
		$next = wp_next_scheduled( self::HOOK );
		if ( $next ) {
			wp_unschedule_event( $next, self::HOOK );
		}

		wp_schedule_single_event( $timestamp, self::HOOK );
		$this->logger->debug( 'Product sync scheduled', array( 'at' => $timestamp ) );
	}
}
