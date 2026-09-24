<?php
/**
 * Runtime configuration helpers.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Support;

use Shoppio\Database\Options;

final class Config {

	public function get_api_url(): string {
		$url = Options::get( 'shoppio_api_url', '' );
		return is_string( $url ) ? untrailingslashit( $url ) : '';
	}

	public function set_api_url( string $url ): void {
		Options::update( 'shoppio_api_url', untrailingslashit( esc_url_raw( $url ) ) );
	}

	public function get_site_id(): string {
		$value = Options::get( 'shoppio_site_id', '' );
		return is_string( $value ) ? $value : '';
	}

	public function get_key_id(): string {
		$value = Options::get( 'shoppio_key_id', '' );
		return is_string( $value ) ? $value : '';
	}

	/**
	 * API secret — server-side only. Never print to JS or HTML.
	 */
	public function get_api_secret(): string {
		$value = Options::get( 'shoppio_api_secret', '' );
		return is_string( $value ) ? $value : '';
	}

	public function is_connected(): bool {
		return 'connected' === Options::get( 'shoppio_connection_status', 'disconnected' )
			&& '' !== $this->get_key_id()
			&& '' !== $this->get_api_secret()
			&& '' !== $this->get_api_url();
	}

	public function store_connection( string $site_id, string $key_id, string $secret ): void {
		Options::update( 'shoppio_site_id', sanitize_text_field( $site_id ) );
		Options::update( 'shoppio_key_id', sanitize_text_field( $key_id ) );
		Options::update( 'shoppio_api_secret', $secret, false );
		Options::update( 'shoppio_connection_status', 'connected' );
		Options::update( 'shoppio_connected_at', gmdate( 'c' ) );
	}

	public function clear_connection(): void {
		Options::delete( 'shoppio_site_id' );
		Options::delete( 'shoppio_key_id' );
		Options::delete( 'shoppio_api_secret' );
		Options::delete( 'shoppio_connected_at' );
		Options::update( 'shoppio_connection_status', 'disconnected' );
		delete_transient( 'shoppio_access_token' );
	}

	public function plugin_version(): string {
		return SHOPPIO_VERSION;
	}
}
