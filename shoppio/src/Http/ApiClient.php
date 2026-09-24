<?php
/**
 * Shoppio backend HTTP client.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Http;

use Shoppio\Support\Config;
use Shoppio\Support\Logger;

final class ApiClient {

	private Config $config;
	private Logger $logger;

	public function __construct( Config $config, Logger $logger ) {
		$this->config = $config;
		$this->logger = $logger;
	}

	/**
	 * @param array<string, mixed> $body Request body.
	 * @param array<string, string> $headers Extra headers.
	 */
	public function post( string $path, array $body = array(), array $headers = array(), bool $authenticated = false ): ApiResponse {
		return $this->request( 'POST', $path, $body, $headers, $authenticated );
	}

	/**
	 * @param array<string, string> $headers Extra headers.
	 */
	public function get( string $path, array $headers = array(), bool $authenticated = true ): ApiResponse {
		return $this->request( 'GET', $path, array(), $headers, $authenticated );
	}

	/**
	 * @param array<string, mixed> $body Request body.
	 * @param array<string, string> $headers Extra headers.
	 */
	public function request(
		string $method,
		string $path,
		array $body = array(),
		array $headers = array(),
		bool $authenticated = false
	): ApiResponse {
		$base = $this->config->get_api_url();

		if ( '' === $base ) {
			return new ApiResponse( 0, false, null, 'MISSING_API_URL', 'Shoppio API URL is not configured' );
		}

		$url = $base . '/' . ltrim( $path, '/' );

		$request_headers = array_merge(
			array(
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
				'User-Agent'   => 'Shoppio-WordPress/' . $this->config->plugin_version(),
			),
			$headers
		);

		if ( $authenticated ) {
			$token = $this->get_access_token();
			if ( null === $token ) {
				return new ApiResponse( 0, false, null, 'AUTH_FAILED', 'Unable to obtain Shoppio access token' );
			}
			$request_headers['Authorization'] = 'Bearer ' . $token;
		}

		$args = array(
			'method'  => strtoupper( $method ),
			'headers' => $request_headers,
			'timeout' => 30,
		);

		if ( ! empty( $body ) ) {
			$args['body'] = wp_json_encode( $body );
		}

		$this->logger->debug(
			'API request',
			array(
				'method' => $method,
				'path'   => $path,
			)
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			$this->logger->error( 'API transport error', array( 'path' => $path, 'error' => $response->get_error_message() ) );
			return ApiResponse::from_wp_error( $response );
		}

		$parsed = ApiResponse::from_wp_response( $response );

		if ( ! $parsed->ok() ) {
			$this->logger->error(
				'API error response',
				array(
					'path'    => $path,
					'status'  => $parsed->status_code(),
					'code'    => $parsed->error_code(),
					'message' => $parsed->error_message(),
				)
			);
		}

		return $parsed;
	}

	private function get_access_token(): ?string {
		$cached = get_transient( 'shoppio_access_token' );
		if ( is_string( $cached ) && '' !== $cached ) {
			return $cached;
		}

		$key_id = $this->config->get_key_id();
		$secret = $this->config->get_api_secret();

		if ( '' === $key_id || '' === $secret ) {
			return null;
		}

		$response = $this->request(
			'POST',
			'/api/v1/auth/token',
			array(
				'keyId'  => $key_id,
				'secret' => $secret,
			),
			array(),
			false
		);

		if ( ! $response->ok() || ! is_array( $response->data() ) ) {
			return null;
		}

		$data  = $response->data();
		$token = isset( $data['accessToken'] ) ? (string) $data['accessToken'] : '';
		$ttl   = isset( $data['expiresIn'] ) ? (int) $data['expiresIn'] : 3600;

		if ( '' === $token ) {
			return null;
		}

		// Refresh slightly before expiry.
		set_transient( 'shoppio_access_token', $token, max( 60, $ttl - 60 ) );

		return $token;
	}
}
