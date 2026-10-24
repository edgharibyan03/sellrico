<?php
/**
 * Storefront chat widget assets.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Frontend;

use Shoppio\Http\ApiClient;
use Shoppio\Support\Config;

final class ChatWidget {

	private Config $config;
	private ApiClient $client;

	public function __construct( Config $config, ApiClient $client ) {
		$this->config = $config;
		$this->client = $client;
	}

	public function register(): void {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	public function enqueue(): void {
		if ( is_admin() || ! $this->config->is_connected() ) {
			return;
		}

		wp_enqueue_style(
			'shoppio-chat',
			SHOPPIO_URL . 'assets/css/chat-widget.css',
			array(),
			SHOPPIO_VERSION
		);

		wp_enqueue_script(
			'shoppio-chat',
			SHOPPIO_URL . 'assets/js/chat-widget.js',
			array(),
			SHOPPIO_VERSION,
			true
		);

		$assistant = $this->assistant_config();

		wp_localize_script(
			'shoppio-chat',
			'shoppioChat',
			array(
				'restUrl'      => esc_url_raw( rest_url( 'shoppio/v1/chat' ) ),
				'nonce'        => wp_create_nonce( 'wp_rest' ),
				'siteLang'     => $this->normalize_lang( determine_locale() ),
				'showBranding' => $this->show_branding(),
				'assistant'    => $assistant,
				'i18n'         => array(
					'en' => array(
						'welcomeMessage'   => 'Hi! Looking for something specific? I can help you find products.',
						'title'            => 'Shoppio Assistant',
						'placeholder'      => 'Ask about products…',
						'sendLabel'        => 'Send',
						'openProductLabel' => 'Open product',
						'productsLabel'    => 'Products',
						'inStockLabel'     => 'In stock',
						'outOfStockLabel'  => 'Out of stock',
						'thinkingLabel'    => 'Thinking…',
						'networkError'     => 'Network error. Please try again in a moment.',
						'genericError'     => 'Sorry, I could not answer right now.',
					),
					'ru' => array(
						'welcomeMessage'   => 'Здравствуйте! Ищете что-то конкретное? Помогу подобрать товары.',
						'title'            => 'Помощник Shoppio',
						'placeholder'      => 'Спросите о товарах…',
						'sendLabel'        => 'Отправить',
						'openProductLabel' => 'Открыть товар',
						'productsLabel'    => 'Товары',
						'inStockLabel'     => 'В наличии',
						'outOfStockLabel'  => 'Нет в наличии',
						'thinkingLabel'    => 'Думаю…',
						'networkError'     => 'Ошибка сети. Попробуйте ещё раз чуть позже.',
						'genericError'     => 'Извините, сейчас не удалось ответить.',
					),
				),
			)
		);
	}

	/**
	 * Branding is an entitlement from the Shoppio API, not a local plan check.
	 * If the API is unavailable, branding stays visible.
	 */
	private function show_branding(): bool {
		$cached = get_transient( 'shoppio_entitlements' );
		if ( is_array( $cached ) && array_key_exists( 'removeBranding', $cached ) ) {
			return ! (bool) $cached['removeBranding'];
		}

		$remove   = false;
		$response = $this->client->get( '/api/v1/billing/entitlements' );
		if ( $response->ok() ) {
			$data = $response->data();
			if ( is_array( $data ) ) {
				$features = isset( $data['features'] ) && is_array( $data['features'] ) ? $data['features'] : array();
				$remove   = in_array( 'remove_branding', $features, true ) || ! empty( $data['removeBranding'] );
			}
		}

		set_transient( 'shoppio_entitlements', array( 'removeBranding' => $remove ), 5 * MINUTE_IN_SECONDS );
		return ! $remove;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function assistant_config(): array {
		$defaults = array(
			'name'               => 'Shoppio Assistant',
			'welcomeMessage'     => '',
			'language'           => '',
			'tone'               => 'friendly',
			'primaryColor'       => '#0F766E',
			'suggestedQuestions' => array(),
			'offsetRight'        => 20,
			'offsetBottom'       => 20,
		);

		$cached = get_transient( 'shoppio_assistant_config' );
		if ( is_array( $cached ) ) {
			return array_merge( $defaults, $cached );
		}

		$response = $this->client->get( '/api/v1/sites/me/assistant' );
		if ( ! $response->ok() || ! is_array( $response->data() ) ) {
			return $defaults;
		}

		$data = $response->data();
		$config = array(
			'name'               => isset( $data['name'] ) ? (string) $data['name'] : $defaults['name'],
			'welcomeMessage'     => isset( $data['welcomeMessage'] ) ? (string) $data['welcomeMessage'] : '',
			'language'           => isset( $data['language'] ) ? (string) $data['language'] : '',
			'tone'               => isset( $data['tone'] ) ? (string) $data['tone'] : 'friendly',
			'primaryColor'       => isset( $data['primaryColor'] ) ? (string) $data['primaryColor'] : '#0F766E',
			'suggestedQuestions' => array(),
			'offsetRight'        => isset( $data['offsetRight'] ) ? (int) $data['offsetRight'] : 20,
			'offsetBottom'       => isset( $data['offsetBottom'] ) ? (int) $data['offsetBottom'] : 20,
		);

		if ( isset( $data['suggestedQuestions'] ) && is_array( $data['suggestedQuestions'] ) ) {
			foreach ( $data['suggestedQuestions'] as $question ) {
				if ( is_string( $question ) && '' !== trim( $question ) ) {
					$config['suggestedQuestions'][] = trim( $question );
				}
			}
		}

		set_transient( 'shoppio_assistant_config', $config, 2 * MINUTE_IN_SECONDS );
		return $config;
	}

	private function normalize_lang( string $locale ): string {
		$locale = strtolower( str_replace( '_', '-', $locale ) );
		if ( 0 === strpos( $locale, 'ru' ) || 0 === strpos( $locale, 'hy' ) ) {
			return 'ru';
		}
		return 'en';
	}
}
