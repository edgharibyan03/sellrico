<?php
/**
 * Safe logger — never logs secrets or tokens.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Support;

final class Logger {

	private const REDACT_KEYS = array(
		'secret',
		'api_secret',
		'password',
		'token',
		'accessToken',
		'access_token',
		'authorization',
		'jwt',
	);

	public function debug( string $message, array $context = array() ): void {
		if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
			return;
		}

		$this->write( 'debug', $message, $context );
	}

	public function info( string $message, array $context = array() ): void {
		$this->write( 'info', $message, $context );
	}

	public function error( string $message, array $context = array() ): void {
		$this->write( 'error', $message, $context );
	}

	private function write( string $level, string $message, array $context ): void {
		$safe_context = $this->redact( $context );
		$encoded      = $safe_context ? ' ' . wp_json_encode( $safe_context ) : '';
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( sprintf( '[Shoppio][%s] %s%s', strtoupper( $level ), $message, $encoded ) );
	}

	/**
	 * @param array<string, mixed> $context
	 * @return array<string, mixed>
	 */
	private function redact( array $context ): array {
		$out = array();

		foreach ( $context as $key => $value ) {
			$key_lower = strtolower( (string) $key );
			$redact    = false;

			foreach ( self::REDACT_KEYS as $needle ) {
				if ( false !== strpos( $key_lower, strtolower( $needle ) ) ) {
					$redact = true;
					break;
				}
			}

			if ( $redact ) {
				$out[ $key ] = '[redacted]';
				continue;
			}

			if ( is_array( $value ) ) {
				$out[ $key ] = $this->redact( $value );
				continue;
			}

			$out[ $key ] = $value;
		}

		return $out;
	}
}
