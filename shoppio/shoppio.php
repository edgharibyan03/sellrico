<?php
/**
 * Plugin Name:       Shoppio
 * Plugin URI:        https://shoppio.io
 * Description:       AI assistant for WordPress and WooCommerce — connect your site to the Shoppio platform.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      8.1
 * Author:            Shoppio
 * Author URI:        https://shoppio.io
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       shoppio
 * Domain Path:       /languages
 *
 * @package Shoppio
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SHOPPIO_VERSION', '0.1.4' );
define( 'SHOPPIO_FILE', __FILE__ );
define( 'SHOPPIO_PATH', plugin_dir_path( __FILE__ ) );
define( 'SHOPPIO_URL', plugin_dir_url( __FILE__ ) );
define( 'SHOPPIO_BASENAME', plugin_basename( __FILE__ ) );

$shoppio_autoload = SHOPPIO_PATH . 'vendor/autoload.php';

if ( ! file_exists( $shoppio_autoload ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			if ( ! current_user_can( 'activate_plugins' ) ) {
				return;
			}
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'Shoppio requires Composer dependencies. Run composer install in the plugin directory.', 'shoppio' );
			echo '</p></div>';
		}
	);
	return;
}

require_once $shoppio_autoload;

register_activation_hook( __FILE__, array( \Shoppio\Support\Activator::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( \Shoppio\Support\Deactivator::class, 'deactivate' ) );

/**
 * Boot the plugin.
 */
function shoppio(): \Shoppio\Plugin {
	return \Shoppio\Plugin::instance();
}

shoppio()->boot();
