<?php
/**
 * Reads published WooCommerce products for sync.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\WooCommerce;

final class ProductCatalog {

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function fetch_all( int $per_page = 50 ): array {
		if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_get_products' ) ) {
			return array();
		}

		$currency = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD';
		$page     = 1;
		$all      = array();

		do {
			$products = wc_get_products(
				array(
					'status'  => array( 'publish' ),
					'limit'   => $per_page,
					'page'    => $page,
					'orderby' => 'ID',
					'order'   => 'ASC',
					'return'  => 'objects',
				)
			);

			if ( ! is_array( $products ) || array() === $products ) {
				break;
			}

			foreach ( $products as $product ) {
				if ( ! $product instanceof \WC_Product ) {
					continue;
				}
				$all[] = $this->map_product( $product, $currency );
			}

			++$page;
		} while ( count( $products ) === $per_page && $page <= 40 );

		return $all;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function map_product( \WC_Product $product, string $currency ): array {
		$image_id  = $product->get_image_id();
		$image_url = $image_id ? wp_get_attachment_image_url( (int) $image_id, 'medium' ) : null;

		$categories = array();
		$terms      = get_the_terms( $product->get_id(), 'product_cat' );
		if ( is_array( $terms ) ) {
			foreach ( $terms as $term ) {
				$categories[] = $term->name;
			}
		}

		$price = $product->get_price();

		return array(
			'externalProductId' => (string) $product->get_id(),
			'name'              => $product->get_name(),
			'description'       => wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() ),
			'price'             => '' === $price || null === $price ? null : (float) $price,
			'currency'          => $currency,
			'url'               => get_permalink( $product->get_id() ) ?: null,
			'imageUrl'          => is_string( $image_url ) ? $image_url : null,
			'stockStatus'       => $this->map_stock_status( $product->get_stock_status() ),
			'category'          => $categories ? $categories[0] : null,
		);
	}

	private function map_stock_status( string $status ): string {
		if ( 'outofstock' === $status ) {
			return 'out_of_stock';
		}
		if ( 'onbackorder' === $status ) {
			return 'on_backorder';
		}
		return 'in_stock';
	}
}
