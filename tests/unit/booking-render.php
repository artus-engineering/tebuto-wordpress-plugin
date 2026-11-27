<?php
/** Standalone renderer regression checks: php tests/unit/booking-render.php */
define('ABSPATH', __DIR__);
define('TEBUTO_COLOR_WHITE', '#ffffff');
define('TEBUTO_COLOR_GRAY', '#6b7280');
define('TEBUTO_WIDGET_URL', 'https://example.test/booking.js');
function add_action(...$args) {}
function add_shortcode(...$args) {}
function is_admin() { return false; }
function tebuto_get_connected_user_id() { return 1; }
function tebuto_get_user_meta($id, $key, $fallback = '') { return $key === 'therapist_uuid' ? 'saved-account' : $fallback; }
function sanitize_hex_color($value) { return preg_match('/^#[0-9a-f]{6}$/i', $value) ? $value : null; }
function wp_strip_all_tags($value) { return strip_tags($value); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_url($value) { return esc_attr($value); }
function wp_json_encode($value) { return json_encode($value); }
function shortcode_atts($defaults, $atts, $name) { return array_merge($defaults, array_intersect_key($atts, $defaults)); }
class Tebuto_API {
    public function __construct($id) { throw new RuntimeException('Public block attempted management API access'); }
}
$plugin = dirname(__DIR__, 2) . '/tebuto-online-terminbuchung';
require $plugin . '/includes/widget-theme.php';
require $plugin . '/includes/shortcode.php';
require $plugin . '/block/block.php';
function check($condition, $message) {
    if (!$condition) { throw new RuntimeException($message); }
}
$default = tebuto_render_booking_block([]);
check(strpos($default, 'data-therapist-uuid="saved-account"') !== false, 'Default block must render without API');
$categories = [['id' => 12, 'name' => 'Category "A" <test>', 'isFromSubaccount' => true, 'therapistUuid' => 'subaccount']];
$html = tebuto_render_booking_block(['configuredCategoriesJson' => json_encode($categories)]);
preg_match('/data-configured-categories="([^"]*)"/', $html, $match);
check(json_decode(html_entity_decode($match[1] ?? '', ENT_QUOTES, 'UTF-8'), true) === $categories, 'Saved metadata must survive without OAuth/API');
check(strpos($html, 'data-categories="12"') !== false, 'Saved IDs must survive');
check(strpos($html, 'data-include-subusers="true"') !== false, 'Subaccount selection must survive');
foreach (['', '{invalid', 'null', '[null,{},0]'] as $invalid) {
    $html = tebuto_render_booking_block(['configuredCategoriesJson' => $invalid, 'showProviderFilter' => true]);
    check(strpos($html, 'data-configured-categories=') === false, 'Invalid metadata must be omitted without API access');
}
try {
    tebuto_widget_shortcode([]);
    throw new RuntimeException('Shortcode enrichment was unexpectedly skipped');
} catch (RuntimeException $error) {
    check($error->getMessage() === 'Public block attempted management API access', 'Shortcode must retain existing enrichment');
}
echo "Booking renderer regression checks passed\n";
