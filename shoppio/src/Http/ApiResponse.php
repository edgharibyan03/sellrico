<?php
/**
 * HTTP response wrapper for Shoppio API calls.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Http;

final class ApiResponse {

	private int $status_code;
	private bool $success;
	/** @var mixed */
	private $data;
	private ?string $error_code;
	private ?string $error_message;
	private string $raw_body;

	/**
	 * @param mixed $data Response data.
	 */
	public function __construct(
		int $status_code,
		bool $success,
		$data = null,
		?string $error_code = null,
		?string $error_message = null,
		string $raw_body = ''
	) {
		$this->status_code   = $status_code;
		$this->success       = $success;
		$this->data          = $data;
		$this->error_code    = $error_code;
		$this->error_message = $error_message;
		$this->raw_body      = $raw_body;
	}

	public static function from_wp_response( array $response ): self {
		$code = (int) wp_remote_retrieve_response_code( $response );
		$body = (string) wp_remote_retrieve_body( $response );
		$json = json_decode( $body, true );

		if ( ! is_array( $json ) ) {
			return new self( $code, false, null, 'INVALID_JSON', 'Invalid JSON response from Shoppio API', $body );
		}

		$success = ! empty( $json['success'] );

		if ( $success ) {
			return new self( $code, true, $json['data'] ?? null, null, null, $body );
		}

		$error = isset( $json['error'] ) && is_array( $json['error'] ) ? $json['error'] : array();

		return new self(
			$code,
			false,
			null,
			isset( $error['code'] ) ? (string) $error['code'] : 'API_ERROR',
			isset( $error['message'] ) ? (string) $error['message'] : 'Shoppio API request failed',
			$body
		);
	}

	public static function from_wp_error( \WP_Error $error ): self {
		return new self( 0, false, null, 'HTTP_ERROR', $error->get_error_message() );
	}

	public function ok(): bool {
		return $this->success;
	}

	public function status_code(): int {
		return $this->status_code;
	}

	/**
	 * @return mixed
	 */
	public function data() {
		return $this->data;
	}

	public function error_code(): ?string {
		return $this->error_code;
	}

	public function error_message(): ?string {
		return $this->error_message;
	}
}
