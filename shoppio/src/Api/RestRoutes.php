<?php
/**
 * WordPress REST routes for Shoppio (status + chat proxy).
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Api;

use Shoppio\Http\ApiClient;
use Shoppio\Support\Config;
use Shoppio\Support\Logger;
use Shoppio\WooCommerce\ProductSyncer;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class RestRoutes {

	private Config $config;
	private ApiClient $client;
	private Logger $logger;
	private ProductSyncer $product_syncer;

	public function __construct(
		Config $config,
		ApiClient $client,
		Logger $logger,
		ProductSyncer $product_syncer
	) {
		$this->config         = $config;
		$this->client         = $client;
		$this->logger         = $logger;
		$this->product_syncer = $product_syncer;
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			'shoppio/v1',
			'/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'status' ),
				'permission_callback' => static function (): bool {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_rest_route(
			'shoppio/v1',
			'/sync-products',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'sync_products' ),
				'permission_callback' => static function (): bool {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'page' => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			'shoppio/v1',
			'/chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'chat' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'message' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'sessionId' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'conversationId' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'locale' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * @return WP_REST_Response
	 */
	public function status() {
		return new WP_REST_Response(
			array(
				'plugin'    => 'shoppio',
				'version'   => SHOPPIO_VERSION,
				'connected' => $this->config->is_connected(),
			),
			200
		);
	}

	/**
	 * Incremental product sync for the admin UI (one catalog page per request).
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function sync_products( WP_REST_Request $request ) {
		$page = (int) $request->get_param( 'page' );
		if ( $page < 1 ) {
			$page = 1;
		}

		try {
			$result = $this->product_syncer->sync_page( $page );
		} catch ( \Throwable $e ) {
			$this->logger->error( 'Product sync page crashed', array( 'message' => $e->getMessage(), 'page' => $page ) );
			return new WP_Error(
				'shoppio_sync_crashed',
				sprintf(
					/* translators: %s: error message */
					__( 'Product sync crashed: %s', 'shoppio' ),
					$e->getMessage()
				),
				array( 'status' => 500 )
			);
		}

		if ( ! $result['success'] ) {
			return new WP_Error(
				'shoppio_sync_failed',
				$result['message'],
				array( 'status' => 400 )
			);
		}

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * Proxy visitor chat to Shoppio backend (keeps site secrets server-side).
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function chat( WP_REST_Request $request ) {
		if ( ! $this->config->is_connected() ) {
			return new WP_Error(
				'shoppio_not_connected',
				__( 'Shoppio is not connected on this site.', 'shoppio' ),
				array( 'status' => 503 )
			);
		}

		$message = (string) $request->get_param( 'message' );
		if ( '' === trim( $message ) ) {
			return new WP_Error(
				'shoppio_empty_message',
				__( 'Message cannot be empty.', 'shoppio' ),
				array( 'status' => 400 )
			);
		}

		$body = array(
			'message' => $message,
		);

		$session_id = $request->get_param( 'sessionId' );
		if ( is_string( $session_id ) && '' !== $session_id ) {
			$body['sessionId'] = $session_id;
		}

		$conversation_id = $request->get_param( 'conversationId' );
		if ( is_string( $conversation_id ) && '' !== $conversation_id ) {
			$body['conversationId'] = $conversation_id;
		}

		$locale = $request->get_param( 'locale' );
		if ( is_string( $locale ) && '' !== $locale ) {
			$body['locale'] = $locale;
		}

		$response = $this->client->post( '/api/v1/chat', $body, array(), true );

		if ( ! $response->ok() ) {
			if ( 'AI_MESSAGE_LIMIT_REACHED' === $response->error_code() ) {
				return new WP_Error(
					'shoppio_ai_limit',
					__( 'The assistant has reached its monthly limit. Please try again later.', 'shoppio' ),
					array( 'status' => 403 )
				);
			}

			$this->logger->error(
				'Chat proxy failed',
				array(
					'code'    => $response->error_code(),
					'message' => $response->error_message(),
				)
			);
			return new WP_Error(
				'shoppio_chat_failed',
				$response->error_message() ?? __( 'Chat request failed.', 'shoppio' ),
				array( 'status' => $response->status_code() ?: 502 )
			);
		}

		return new WP_REST_Response( $response->data(), 200 );
	}
}
