<?php
/**
 * Storefront chat widget assets.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Frontend;

use Shoppio\Support\Config;

final class ChatWidget {

	private Config $config;

	public function __construct( Config $config ) {
		$this->config = $config;
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

		wp_localize_script(
			'shoppio-chat',
			'shoppioChat',
			array(
				'restUrl'   => esc_url_raw( rest_url( 'shoppio/v1/chat' ) ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'siteLang'  => $this->normalize_lang( determine_locale() ),
				'i18n'      => array(
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
	 * Map WP / BCP47 locales to widget language keys.
	 * Russian + Armenian visitors use Russian UI copy.
	 */
	private function normalize_lang( string $locale ): string {
		$locale = strtolower( str_replace( '_', '-', $locale ) );
		if ( 0 === strpos( $locale, 'ru' ) || 0 === strpos( $locale, 'hy' ) ) {
			return 'ru';
		}
		return 'en';
	}
}
