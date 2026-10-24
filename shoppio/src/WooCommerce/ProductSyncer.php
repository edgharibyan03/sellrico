<?php
/**
 * Pushes WooCommerce products to the Shoppio backend.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\WooCommerce;

use Shoppio\Http\ApiClient;
use Shoppio\Support\Config;
use Shoppio\Support\Logger;

final class ProductSyncer {

	private const STATE_KEY = 'shoppio_product_sync_state';

	private Config $config;
	private ApiClient $client;
	private Logger $logger;
	private ProductCatalog $catalog;

	public function __construct(
		Config $config,
		ApiClient $client,
		Logger $logger,
		ProductCatalog $catalog
	) {
		$this->config  = $config;
		$this->client  = $client;
		$this->logger  = $logger;
		$this->catalog = $catalog;
	}

	/**
	 * Full sync (cron / post-connect). Streams pages to avoid one giant memory spike.
	 *
	 * @return array{success:bool,message:string,upserted?:int,total?:int}
	 */
	public function sync(): array {
		if ( ! $this->config->is_connected() ) {
			return array(
				'success' => false,
				'message' => __( 'Connect Shoppio before syncing products.', 'shoppio' ),
			);
		}

		if ( ! class_exists( 'WooCommerce' ) ) {
			return array(
				'success' => false,
				'message' => __( 'WooCommerce is required for product sync.', 'shoppio' ),
			);
		}

		$this->raise_runtime_limits();
		$this->clear_state();

		$page     = 1;
		$upserted = 0;
		$total    = 0;
		$message  = '';

		while ( true ) {
			$step = $this->sync_page( $page );
			if ( ! $step['success'] ) {
				return array(
					'success' => false,
					'message' => $step['message'],
				);
			}

			$upserted = $step['upserted'];
			$total    = $step['total'];
			$message  = $step['message'];

			if ( ! empty( $step['done'] ) ) {
				break;
			}

			$page = (int) $step['nextPage'];
		}

		return array(
			'success'  => true,
			'message'  => $message,
			'upserted' => $upserted,
			'total'    => $total,
		);
	}

	/**
	 * Sync a single catalog page. Designed for AJAX so each HTTP request stays short.
	 *
	 * @return array{
	 *   success:bool,
	 *   message:string,
	 *   done:bool,
	 *   nextPage?:int,
	 *   page:int,
	 *   upserted:int,
	 *   total:int,
	 *   scanned:int
	 * }
	 */
	public function sync_page( int $page ): array {
		if ( ! $this->config->is_connected() ) {
			return $this->step_error( __( 'Connect Shoppio before syncing products.', 'shoppio' ), $page );
		}

		if ( ! class_exists( 'WooCommerce' ) ) {
			return $this->step_error( __( 'WooCommerce is required for product sync.', 'shoppio' ), $page );
		}

		$this->raise_runtime_limits();

		$page  = max( 1, $page );
		$state = ( 1 === $page ) ? $this->fresh_state() : $this->get_state();

		$products = $this->catalog->fetch_page( $page, ProductCatalog::PAGE_SIZE );

		if ( array() === $products ) {
			$result = $this->send_batch( array(), $state['ids'], $page );
			$this->clear_state();

			if ( ! $result['ok'] ) {
				return $this->step_error( $result['message'], $page );
			}

			$message = ( 0 === count( $state['ids'] ) )
				? __( 'Sync completed — no products found.', 'shoppio' )
				: (
					null !== $result['limit_message']
						? $result['limit_message']
						: sprintf(
							__( 'Synced %1$d products (%2$d in catalog).', 'shoppio' ),
							(int) $state['upserted'],
							(int) $result['total']
						)
				);

			$this->logger->info(
				'Product sync completed',
				array(
					'upserted' => (int) $state['upserted'],
					'total'    => (int) $result['total'],
				)
			);

			return array(
				'success'  => true,
				'message'  => $message,
				'done'     => true,
				'page'     => $page,
				'upserted' => (int) $state['upserted'],
				'total'    => (int) $result['total'],
				'scanned'  => count( $state['ids'] ),
			);
		}

		foreach ( $products as $product ) {
			$state['ids'][] = (string) $product['externalProductId'];
		}

		$scanned  = count( $state['ids'] );
		$is_last  = count( $products ) < ProductCatalog::PAGE_SIZE || $scanned >= ProductCatalog::MAX_PRODUCTS;
		$keep_ids = $is_last ? $state['ids'] : null;

		$result = $this->send_batch( $products, $keep_ids, $page );
		if ( ! $result['ok'] ) {
			$this->clear_state();
			return $this->step_error( $result['message'], $page );
		}

		$state['upserted'] += $result['upserted'];
		$state['total']     = $result['total'] > 0 ? $result['total'] : $state['total'];
		if ( null !== $result['limit_message'] ) {
			$state['limit_message'] = $result['limit_message'];
		}

		if ( $is_last ) {
			$this->clear_state();
			$message = null !== $state['limit_message']
				? $state['limit_message']
				: sprintf(
					__( 'Synced %1$d products (%2$d in catalog).', 'shoppio' ),
					(int) $state['upserted'],
					(int) $state['total']
				);

			$this->logger->info(
				'Product sync completed',
				array(
					'upserted' => (int) $state['upserted'],
					'total'    => (int) $state['total'],
				)
			);

			return array(
				'success'  => true,
				'message'  => $message,
				'done'     => true,
				'page'     => $page,
				'upserted' => (int) $state['upserted'],
				'total'    => (int) $state['total'],
				'scanned'  => $scanned,
			);
		}

		$this->save_state( $state );

		return array(
			'success'  => true,
			/* translators: 1: products scanned so far, 2: products upserted so far */
			'message'  => sprintf( __( 'Syncing… %1$d scanned, %2$d saved.', 'shoppio' ), $scanned, (int) $state['upserted'] ),
			'done'     => false,
			'nextPage' => $page + 1,
			'page'     => $page,
			'upserted' => (int) $state['upserted'],
			'total'    => (int) $state['total'],
			'scanned'  => $scanned,
		);
	}

	/**
	 * @param array<int, array<string, mixed>> $products
	 * @param array<int, string>|null          $keep_external_ids
	 * @return array{ok:bool,message:string,upserted:int,total:int,limit_message:?string}
	 */
	private function send_batch( array $products, ?array $keep_external_ids, int $batch_num ): array {
		$body = array(
			'products' => $products,
		);
		if ( null !== $keep_external_ids ) {
			$body['keepExternalIds'] = $keep_external_ids;
		}

		$response = $this->client->post(
			'/api/v1/products/sync',
			$body,
			array(),
			true
		);

		if ( ! $response->ok() ) {
			$this->logger->error(
				'Product sync batch failed',
				array(
					'batch' => $batch_num,
					'code'  => $response->error_code(),
				)
			);
			return array(
				'ok'            => false,
				'message'       => $response->error_message() ?? __( 'Product sync failed.', 'shoppio' ),
				'upserted'      => 0,
				'total'         => 0,
				'limit_message' => null,
			);
		}

		$data = is_array( $response->data() ) ? $response->data() : array();

		return array(
			'ok'            => true,
			'message'       => '',
			'upserted'      => isset( $data['upserted'] ) ? (int) $data['upserted'] : count( $products ),
			'total'         => isset( $data['total'] ) ? (int) $data['total'] : 0,
			'limit_message' => ( ! empty( $data['limitReached'] ) && isset( $data['message'] ) )
				? (string) $data['message']
				: null,
		);
	}

	/**
	 * @return array{success:bool,message:string,done:bool,page:int,upserted:int,total:int,scanned:int}
	 */
	private function step_error( string $message, int $page ): array {
		return array(
			'success'  => false,
			'message'  => $message,
			'done'     => true,
			'page'     => $page,
			'upserted' => 0,
			'total'    => 0,
			'scanned'  => 0,
		);
	}

	/**
	 * @return array{ids:array<int,string>,upserted:int,total:int,limit_message:?string}
	 */
	private function fresh_state(): array {
		$state = array(
			'ids'           => array(),
			'upserted'      => 0,
			'total'         => 0,
			'limit_message' => null,
		);
		$this->save_state( $state );
		return $state;
	}

	/**
	 * @return array{ids:array<int,string>,upserted:int,total:int,limit_message:?string}
	 */
	private function get_state(): array {
		$raw = get_transient( self::STATE_KEY );
		if ( ! is_array( $raw ) ) {
			return $this->fresh_state();
		}

		return array(
			'ids'           => isset( $raw['ids'] ) && is_array( $raw['ids'] ) ? array_map( 'strval', $raw['ids'] ) : array(),
			'upserted'      => isset( $raw['upserted'] ) ? (int) $raw['upserted'] : 0,
			'total'         => isset( $raw['total'] ) ? (int) $raw['total'] : 0,
			'limit_message' => isset( $raw['limit_message'] ) ? (string) $raw['limit_message'] : null,
		);
	}

	/**
	 * @param array{ids:array<int,string>,upserted:int,total:int,limit_message:?string} $state
	 */
	private function save_state( array $state ): void {
		set_transient( self::STATE_KEY, $state, HOUR_IN_SECONDS );
	}

	private function clear_state(): void {
		delete_transient( self::STATE_KEY );
	}

	private function raise_runtime_limits(): void {
		if ( function_exists( 'wp_raise_memory_limit' ) ) {
			wp_raise_memory_limit( 'admin' );
		}
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 120 );
		}
	}
}
