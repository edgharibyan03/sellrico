<?php
/**
 * WordPress options helpers (autoload false for secrets).
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Database;

final class Options {

	/**
	 * @param mixed $default Default value.
	 * @return mixed
	 */
	public static function get( string $key, $default = false ) {
		$value = get_option( $key, $default );
		return false === $value && false !== $default ? $default : $value;
	}

	/**
	 * @param mixed $value Value to store.
	 */
	public static function update( string $key, $value, bool $autoload = false ): bool {
		$existing = get_option( $key, null );

		if ( null === $existing ) {
			return add_option( $key, $value, '', $autoload ? 'yes' : 'no' );
		}

		return update_option( $key, $value, $autoload );
	}

	public static function delete( string $key ): bool {
		return delete_option( $key );
	}
}
