export default function SelectableRow({
	checked,
	disabled,
	locked = false,
	title,
	onChange,
	leading = null,
	children
}) {
	const className = [
		'tebuto-category-item',
		disabled ? 'tebuto-category-item--unavailable' : '',
		locked ? 'tebuto-category-item--locked' : ''
	]
		.filter(Boolean)
		.join(' ')

	return (
		<label className={className} title={title}>
			<input
				type="checkbox"
				className="tebuto-category-checkbox"
				checked={checked}
				disabled={disabled || locked}
				onChange={(event) => onChange(event.target.checked)}
			/>
			{leading}
			<span className="tebuto-category-label">{children}</span>
		</label>
	)
}
