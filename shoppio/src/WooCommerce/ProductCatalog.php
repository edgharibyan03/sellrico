<?php
/**
 * Reads published WooCommerce products for sync.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\WooCommerce;

final class ProductCatalog {

	public const MAX_PRODUCTS = 10000;
	public const PAGE_SIZE    = 100;

	private const DESCRIPTION_MAX = 2000;
	private const NAME_MAX        = 500;

	/**
	 * Fetch a single page of published products.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public function fetch_page( int $page, int $per_page = self::PAGE_SIZE ): array {
		if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_get_products' ) ) {
			return array();
		}

		$page     = max( 1, $page );
		$per_page = max( 1, min( 100, $per_page ) );
		$currency = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD';

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
			return array();
		}

		$mapped = array();
		foreach ( $products as $product ) {
			if ( ! $product instanceof \WC_Product ) {
				continue;
			}
			$mapped[] = $this->map_product( $product, $currency );
		}

		return $mapped;
	}

	/**
	 * Stream published products page-by-page without holding the full catalog in memory.
	 *
	 * @param callable(array<int, array<string, mixed>>):bool|void $callback Return false to stop early.
	 * @return int Total products yielded (capped at MAX_PRODUCTS).
	 */
	public function each_page( int $per_page, callable $callback ): int {
		$page  = 1;
		$total = 0;

		do {
			$mapped  = $this->fetch_page( $page, $per_page );
			$fetched = count( $mapped );

			if ( 0 === $fetched ) {
				break;
			}

			$remaining = self::MAX_PRODUCTS - $total;
			if ( $remaining <= 0 ) {
				break;
			}
			if ( $fetched > $remaining ) {
				$mapped  = array_slice( $mapped, 0, $remaining );
				$fetched = count( $mapped );
			}

			$continue = $callback( $mapped );
			$total   += $fetched;
			unset( $mapped );
			++$page;

			if ( false === $continue || $total >= self::MAX_PRODUCTS ) {
				break;
			}
		} while ( $fetched === $per_page );

		return $total;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function fetch_all( int $per_page = 50 ): array {
		$all = array();
		$this->each_page(
			$per_page,
			static function ( array $page ) use ( &$all ): void {
				foreach ( $page as $product ) {
					$all[] = $product;
				}
			}
		);
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

		$price       = $product->get_price();
		$name        = $product->get_name();
		$description = wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() );

		if ( function_exists( 'mb_substr' ) ) {
			$name        = mb_substr( $name, 0, self::NAME_MAX );
			$description = mb_substr( $description, 0, self::DESCRIPTION_MAX );
		} else {
			$name        = substr( $name, 0, self::NAME_MAX );
			$description = substr( $description, 0, self::DESCRIPTION_MAX );
		}

		return array(
			'externalProductId' => (string) $product->get_id(),
			'name'              => $name,
			'description'       => $description,
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
