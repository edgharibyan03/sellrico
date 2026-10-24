<?php
/**
 * Main plugin orchestrator.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio;

use Shoppio\Admin\AdminMenu;
use Shoppio\Admin\SettingsPage;
use Shoppio\Api\RestRoutes;
use Shoppio\Auth\ConnectionManager;
use Shoppio\Frontend\ChatWidget;
use Shoppio\Http\ApiClient;
use Shoppio\Support\Config;
use Shoppio\Support\Logger;
use Shoppio\WooCommerce\ProductCatalog;
use Shoppio\WooCommerce\ProductChangeWatcher;
use Shoppio\WooCommerce\ProductSyncer;
use Shoppio\WooCommerce\WooCommerceDetector;

final class Plugin {

	private static ?self $instance = null;

	private Config $config;
	private Logger $logger;
	private ApiClient $api_client;
	private ConnectionManager $connection;
	private ProductSyncer $product_syncer;
	private bool $booted = false;

	private function __construct() {
		$this->config         = new Config();
		$this->logger         = new Logger();
		$this->api_client     = new ApiClient( $this->config, $this->logger );
		$catalog              = new ProductCatalog();
		$this->product_syncer = new ProductSyncer( $this->config, $this->api_client, $this->logger, $catalog );
		$this->connection     = new ConnectionManager( $this->config, $this->api_client, $this->logger, $this->product_syncer );
	}

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}

		$this->booted = true;

		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_action( 'plugins_loaded', array( $this, 'register_modules' ) );
	}

	public function load_textdomain(): void {
		load_plugin_textdomain( 'shoppio', false, dirname( SHOPPIO_BASENAME ) . '/languages' );
	}

	public function register_modules(): void {
		( new AdminMenu() )->register();
		( new SettingsPage( $this->connection, $this->config, $this->product_syncer ) )->register();
		( new RestRoutes( $this->config, $this->api_client, $this->logger, $this->product_syncer ) )->register();
		( new ChatWidget( $this->config, $this->api_client ) )->register();
		( new WooCommerceDetector( $this->logger ) )->register();
		( new ProductChangeWatcher( $this->config, $this->logger, $this->product_syncer ) )->register();
	}

	public function config(): Config {
		return $this->config;
	}

	public function logger(): Logger {
		return $this->logger;
	}

	public function api_client(): ApiClient {
		return $this->api_client;
	}

	public function connection(): ConnectionManager {
		return $this->connection;
	}

	public function product_syncer(): ProductSyncer {
		return $this->product_syncer;
	}
}
