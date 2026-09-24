<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @package Shoppio
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$option_keys = array(
	'shoppio_api_url',
	'shoppio_site_id',
	'shoppio_key_id',
	'shoppio_api_secret',
	'shoppio_connected_at',
	'shoppio_connection_status',
);

foreach ( $option_keys as $key ) {
	delete_option( $key );
}

delete_transient( 'shoppio_access_token' );
