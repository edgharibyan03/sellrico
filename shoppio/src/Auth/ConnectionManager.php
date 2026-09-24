<?php
/**
 * Manages connection to the Shoppio backend.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Auth;

use Shoppio\Http\ApiClient;
use Shoppio\Support\Config;
use Shoppio\Support\Logger;
use Shoppio\WooCommerce\ProductSyncer;

final class ConnectionManager {

	private Config $config;
	private ApiClient $client;
	private Logger $logger;
	private ?ProductSyncer $product_syncer = null;

	public function __construct( Config $config, ApiClient $client, Logger $logger, ?ProductSyncer $product_syncer = null ) {
		$this->config         = $config;
		$this->client         = $client;
		$this->logger         = $logger;
		$this->product_syncer = $product_syncer;
	}

	/**
	 * Connect this WordPress site to Shoppio using a dashboard connect code.
	 *
	 * @return array{success:bool,message:string}
	 */
	public function connect( string $api_url, string $connect_code ): array {
		$this->config->set_api_url( $api_url );

		$connect_code = strtoupper( trim( $connect_code ) );
		if ( '' === $connect_code ) {
			return array(
				'success' => false,
				'message' => __( 'Enter the connect code from your Shoppio dashboard.', 'shoppio' ),
			);
		}

		$domain = wp_parse_url( home_url(), PHP_URL_HOST );
		if ( ! is_string( $domain ) || '' === $domain ) {
			$domain = home_url();
		}

		$response = $this->client->post(
			'/api/v1/auth/connect',
			array(
				'domain'        => $domain,
				'name'          => get_bloginfo( 'name' ),
				'wpVersion'     => get_bloginfo( 'version' ),
				'pluginVersion' => $this->config->plugin_version(),
				'connectCode'   => $connect_code,
			),
			array(),
			false
		);

		if ( ! $response->ok() || ! is_array( $response->data() ) ) {
			$this->logger->error( 'Connect failed', array( 'code' => $response->error_code() ) );
			return array(
				'success' => false,
				'message' => $response->error_message() ?? __( 'Unable to connect to Shoppio.', 'shoppio' ),
			);
		}

		$data = $response->data();

		$site_id = isset( $data['siteId'] ) ? (string) $data['siteId'] : '';
		$key_id  = isset( $data['keyId'] ) ? (string) $data['keyId'] : '';
		$secret  = isset( $data['secret'] ) ? (string) $data['secret'] : '';

		if ( '' === $site_id || '' === $key_id || '' === $secret ) {
			return array(
				'success' => false,
				'message' => __( 'Shoppio returned an incomplete connection payload.', 'shoppio' ),
			);
		}

		$this->config->store_connection( $site_id, $key_id, $secret );
		$this->logger->info( 'Site connected to Shoppio', array( 'keyId' => $key_id ) );

		if ( $this->product_syncer ) {
			$sync = $this->product_syncer->sync();
			if ( $sync['success'] ) {
				return array(
					'success' => true,
					'message' => __( 'Connected to Shoppio. ', 'shoppio' ) . $sync['message'],
				);
			}
			$this->logger->error( 'Post-connect sync failed', array( 'message' => $sync['message'] ) );
			return array(
				'success' => true,
				'message' => __( 'Connected to Shoppio, but product sync failed. Use Sync products in settings.', 'shoppio' ),
			);
		}

		return array(
			'success' => true,
			'message' => __( 'Successfully connected to Shoppio.', 'shoppio' ),
		);
	}

	/**
	 * Disconnect and optionally revoke remote credentials.
	 *
	 * @return array{success:bool,message:string}
	 */
	public function disconnect( bool $revoke_remote = true ): array {
		if ( $revoke_remote && $this->config->is_connected() ) {
			$response = $this->client->post( '/api/v1/auth/revoke', array(), array(), true );
			if ( ! $response->ok() ) {
				$this->logger->error( 'Remote revoke failed during disconnect', array( 'code' => $response->error_code() ) );
			}
		}

		$this->config->clear_connection();

		return array(
			'success' => true,
			'message' => __( 'Disconnected from Shoppio.', 'shoppio' ),
		);
	}

	public function status_label(): string {
		return $this->config->is_connected()
			? __( 'Connected', 'shoppio' )
			: __( 'Not connected', 'shoppio' );
	}
}
