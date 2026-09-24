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

		$products = $this->catalog->fetch_all();
		$all_ids  = array_map(
			static function ( array $p ): string {
				return (string) $p['externalProductId'];
			},
			$products
		);
		$batches  = array_chunk( $products, 100 );
		$upserted = 0;
		$total    = 0;

		if ( array() === $batches ) {
			$response = $this->client->post(
				'/api/v1/products/sync',
				array(
					'products'        => array(),
					'keepExternalIds' => array(),
				),
				array(),
				true
			);

			if ( ! $response->ok() ) {
				return array(
					'success' => false,
					'message' => $response->error_message() ?? __( 'Product sync failed.', 'shoppio' ),
				);
			}

			$data = is_array( $response->data() ) ? $response->data() : array();
			return array(
				'success'  => true,
				'message'  => __( 'Sync completed — no products found.', 'shoppio' ),
				'upserted' => 0,
				'total'    => isset( $data['total'] ) ? (int) $data['total'] : 0,
			);
		}

		$batch_count = count( $batches );
		foreach ( $batches as $index => $batch ) {
			$is_last = ( $index === $batch_count - 1 );
			$body    = array(
				'products' => $batch,
			);
			if ( $is_last ) {
				$body['keepExternalIds'] = $all_ids;
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
						'batch' => $index + 1,
						'code'  => $response->error_code(),
					)
				);
				return array(
					'success' => false,
					'message' => $response->error_message() ?? __( 'Product sync failed.', 'shoppio' ),
				);
			}

			$data      = is_array( $response->data() ) ? $response->data() : array();
			$upserted += isset( $data['upserted'] ) ? (int) $data['upserted'] : count( $batch );
			$total     = isset( $data['total'] ) ? (int) $data['total'] : $total;
		}

		$this->logger->info(
			'Product sync completed',
			array(
				'upserted' => $upserted,
				'total'    => $total,
			)
		);

		return array(
			'success'  => true,
			/* translators: 1: upserted count, 2: total count */
			'message'  => sprintf( __( 'Synced %1$d products (%2$d in catalog).', 'shoppio' ), $upserted, $total ),
			'upserted' => $upserted,
			'total'    => $total,
		);
	}
}
