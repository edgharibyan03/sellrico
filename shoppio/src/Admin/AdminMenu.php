<?php
/**
 * Admin menu registration.
 *
 * @package Shoppio
 */

declare(strict_types=1);

namespace Shoppio\Admin;

final class AdminMenu {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
	}

	public function add_menu(): void {
		add_menu_page(
			__( 'Shoppio', 'shoppio' ),
			__( 'Shoppio', 'shoppio' ),
			'manage_options',
			'shoppio',
			array( SettingsPage::class, 'render_static' ),
			'dashicons-format-chat',
			58
		);
	}
}
