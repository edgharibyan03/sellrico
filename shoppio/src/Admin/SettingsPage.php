<?php
/**
 * Shoppio settings / connection page.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Admin;

use Shoppio\Auth\ConnectionManager;
use Shoppio\Support\Config;
use Shoppio\WooCommerce\ProductSyncer;

final class SettingsPage {

	private static ?self $instance = null;

	private ConnectionManager $connection;
	private Config $config;
	private ProductSyncer $product_syncer;

	public function __construct(
		ConnectionManager $connection,
		Config $config,
		ProductSyncer $product_syncer
	) {
		$this->connection     = $connection;
		$this->config         = $config;
		$this->product_syncer = $product_syncer;
		self::$instance       = $this;
	}

	public function register(): void {
		add_action( 'admin_init', array( $this, 'handle_actions' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	public static function render_static(): void {
		if ( null === self::$instance ) {
			echo '<div class="wrap"><p>' . esc_html__( 'Shoppio is not initialized.', 'shoppio' ) . '</p></div>';
			return;
		}

		self::$instance->render();
	}

	public function enqueue_assets( string $hook ): void {
		if ( 'toplevel_page_shoppio' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'shoppio-admin',
			SHOPPIO_URL . 'assets/css/admin.css',
			array(),
			SHOPPIO_VERSION
		);

		wp_enqueue_script(
			'shoppio-admin',
			SHOPPIO_URL . 'assets/js/admin.js',
			array(),
			SHOPPIO_VERSION,
			true
		);

		wp_localize_script(
			'shoppio-admin',
			'ShoppioAdmin',
			array(
				'syncUrl'   => esc_url_raw( rest_url( 'shoppio/v1/sync-products' ) ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'i18n'      => array(
					'starting' => __( 'Starting product sync…', 'shoppio' ),
					'failed'   => __( 'Product sync failed.', 'shoppio' ),
				),
			)
		);
	}

	public function handle_actions(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_POST['shoppio_connect'] ) ) {
			check_admin_referer( 'shoppio_connect' );

			$api_url      = isset( $_POST['shoppio_api_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['shoppio_api_url'] ) ) : '';
			$connect_code = isset( $_POST['shoppio_connect_code'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['shoppio_connect_code'] ) ) : '';
			$result       = $this->connection->connect( $api_url, $connect_code );

			add_settings_error(
				'shoppio',
				'shoppio_connect',
				$result['message'],
				$result['success'] ? 'success' : 'error'
			);
		}

		if ( isset( $_POST['shoppio_disconnect'] ) ) {
			check_admin_referer( 'shoppio_disconnect' );
			$result = $this->connection->disconnect( true );

			add_settings_error(
				'shoppio',
				'shoppio_disconnect',
				$result['message'],
				'success'
			);
		}
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$connected = $this->config->is_connected();
		$api_url   = $this->config->get_api_url();
		$key_id    = $this->config->get_key_id();
		$woo       = class_exists( 'WooCommerce' );

		settings_errors( 'shoppio' );
		?>
		<div class="wrap shoppio-settings">
			<h1><?php echo esc_html__( 'Shoppio', 'shoppio' ); ?></h1>
			<p><?php echo esc_html__( 'Connect this WordPress site to the Shoppio backend. API secrets are stored server-side and never exposed to the browser.', 'shoppio' ); ?></p>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php echo esc_html__( 'Status', 'shoppio' ); ?></th>
					<td>
						<span class="shoppio-status shoppio-status--<?php echo $connected ? 'connected' : 'disconnected'; ?>">
							<?php echo esc_html( $this->connection->status_label() ); ?>
						</span>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php echo esc_html__( 'WooCommerce', 'shoppio' ); ?></th>
					<td>
						<?php
						echo $woo
							? esc_html__( 'Detected', 'shoppio' )
							: esc_html__( 'Not detected — install WooCommerce to sync products.', 'shoppio' );
						?>
					</td>
				</tr>
				<?php if ( $connected ) : ?>
					<tr>
						<th scope="row"><?php echo esc_html__( 'Key ID', 'shoppio' ); ?></th>
						<td><code><?php echo esc_html( $key_id ); ?></code></td>
					</tr>
					<tr>
						<th scope="row"><?php echo esc_html__( 'Site ID', 'shoppio' ); ?></th>
						<td><code><?php echo esc_html( $this->config->get_site_id() ); ?></code></td>
					</tr>
				<?php endif; ?>
			</table>

			<?php if ( ! $connected ) : ?>
				<form method="post">
					<?php wp_nonce_field( 'shoppio_connect' ); ?>
					<table class="form-table" role="presentation">
						<tr>
							<th scope="row">
								<label for="shoppio_api_url"><?php echo esc_html__( 'API base URL', 'shoppio' ); ?></label>
							</th>
							<td>
								<input
									type="url"
									class="regular-text"
									id="shoppio_api_url"
									name="shoppio_api_url"
									value="<?php echo esc_attr( $api_url ?: 'https://api.sellrico.com' ); ?>"
									placeholder="https://api.sellrico.com"
									required
								/>
								<p class="description">
									<?php echo esc_html__( 'Origin only (no /api/v1 path), e.g. https://api.sellrico.com', 'shoppio' ); ?>
								</p>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="shoppio_connect_code"><?php echo esc_html__( 'Connect code', 'shoppio' ); ?></label>
							</th>
							<td>
								<input
									type="text"
									class="regular-text"
									id="shoppio_connect_code"
									name="shoppio_connect_code"
									placeholder="SP-XXXX-XXXX"
									required
									autocomplete="off"
								/>
								<p class="description">
									<?php echo esc_html__( 'Paste the code from your Shoppio dashboard onboarding / sites page.', 'shoppio' ); ?>
								</p>
							</td>
						</tr>
					</table>
					<?php submit_button( __( 'Connect to Shoppio', 'shoppio' ), 'primary', 'shoppio_connect' ); ?>
				</form>
			<?php else : ?>
				<p class="description"><?php echo esc_html__( 'API URL:', 'shoppio' ); ?> <code><?php echo esc_html( $api_url ); ?></code></p>

				<p>
					<button
						type="button"
						class="button button-secondary"
						id="shoppio-sync-products"
						<?php disabled( ! $woo ); ?>
					>
						<?php echo esc_html__( 'Sync products', 'shoppio' ); ?>
					</button>
				</p>
				<div
					id="shoppio-sync-status"
					class="notice inline"
					style="display:none;margin:8px 0 16px;padding:8px 12px;"
				></div>

				<form method="post" style="display:inline-block;">
					<?php wp_nonce_field( 'shoppio_disconnect' ); ?>
					<?php submit_button( __( 'Disconnect', 'shoppio' ), 'delete', 'shoppio_disconnect', false ); ?>
				</form>
			<?php endif; ?>
		</div>
		<?php
	}
}
