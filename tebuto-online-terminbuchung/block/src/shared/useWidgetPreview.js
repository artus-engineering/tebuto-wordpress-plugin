import { __ } from '@wordpress/i18n'
import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { getPreviewThemeDataset } from './previewTheme'

const LOADING_COLOR_FALLBACK = '#00B4A9'

function createLoadingPlaceholder(doc, primaryColor) {
	const placeholder = doc.createElement('div')
	placeholder.className = 'tebuto-widget-loading'
	placeholder.setAttribute('role', 'status')
	if (primaryColor) {
		placeholder.style.setProperty('--tebuto-widget-loading-color', primaryColor)
	}

	const spinner = doc.createElement('span')
	spinner.className = 'tebuto-widget-loading__spinner'
	spinner.setAttribute('aria-hidden', 'true')

	const label = doc.createElement('span')
	label.className = 'tebuto-widget-loading__label'
	label.textContent = __('Widget wird geladen…', 'tebuto-online-terminbuchung')

	placeholder.append(spinner, label)
	return placeholder
}

function createLoadingError(doc) {
	const error = doc.createElement('p')
	error.className = 'tebuto-widget-loading-error'
	error.textContent = __('Widget-Vorschau konnte nicht geladen werden.', 'tebuto-online-terminbuchung')
	return error
}

function applyCommonDataset(script, therapistUuid, attributes, surface) {
	const { border, inheritFont } = attributes

	script.dataset.therapistUuid = therapistUuid
	Object.assign(script.dataset, getPreviewThemeDataset(attributes, surface))
	script.dataset.border = border ? 'true' : 'false'
	script.dataset.inheritFont = inheritFont ? 'true' : 'false'
}

function applyBookingDataset(script, attributes, selectedCategories, shouldUseConfiguredCategories) {
	const { showLocationQuickFilter, showCategorySelectionFirst, categories } = attributes

	if (attributes.showQuickFilters) {
		script.dataset.showQuickFilters = 'true'
	}
	if (shouldUseConfiguredCategories) {
		script.dataset.includeSubusers = 'true'
		script.dataset.showQuickFilters = 'true'
	}
	if (showLocationQuickFilter) {
		script.dataset.showLocationQuickFilter = 'true'
	}

	if (shouldUseConfiguredCategories && selectedCategories.length > 0) {
		script.dataset.configuredCategories = JSON.stringify(
			selectedCategories.map((category) => ({
				id: category.id,
				name: category.name,
				color: category.color,
				isFromSubaccount: Boolean(category.isFromSubaccount),
				therapistId: category.therapistId ?? 0,
				therapistName: category.therapistName ?? ''
			}))
		)
	}

	if (categories) {
		script.dataset.categories = categories
	}

	if (showCategorySelectionFirst === false) {
		script.dataset.showCategorySelectionFirst = 'false'
	}
}

function applySeminarsDataset(script, attributes) {
	const { seminars, showListFirst } = attributes

	if (seminars?.trim()) {
		script.dataset.seminars = seminars.trim()
	}

	if (showListFirst === false) {
		script.dataset.showListFirst = 'false'
	}
}

/**
 * Inject / reload the booking or seminars widget script into a container.
 *
 * @param {import('react').RefObject<HTMLElement|null>} containerRef
 * @param {{
 *   variant: 'booking'|'seminars',
 *   therapistUuid: string,
 *   widgetUrl: string,
 *   attributes: Record<string, unknown>,
 *   surface?: 'inspector'|'admin',
 *   selectedCategories?: Array<Record<string, unknown>>,
 *   shouldUseConfiguredCategories?: boolean,
 * }} options
 */
export default function useWidgetPreview(containerRef, options) {
	const {
		variant,
		therapistUuid,
		widgetUrl,
		attributes,
		surface = 'inspector',
		selectedCategories = [],
		shouldUseConfiguredCategories = false
	} = options

	const widgetScriptRef = useRef(null)
	const previewId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

	const loadWidgetPreview = useCallback(() => {
		if (!containerRef.current || !therapistUuid || !widgetUrl) {
			return
		}

		const legacyId = variant === 'seminars' ? 'tebuto-seminars-widget' : 'tebuto-booking-widget'
		const containerId = `${legacyId}-preview-${previewId}`
		const doc = containerRef.current.ownerDocument
		const mount = doc.createElement('div')
		mount.id = containerId
		mount.appendChild(createLoadingPlaceholder(doc, attributes.primaryColor || LOADING_COLOR_FALLBACK))
		containerRef.current.replaceChildren(mount)
		if (attributes.customCss) {
			const style = doc.createElement('style')
			const css = attributes.customCss.replaceAll(`#${legacyId}`, ':scope')
			style.textContent = `@scope (#${containerId}) { ${css} }`
			containerRef.current.appendChild(style)
		}

		if (widgetScriptRef.current) {
			widgetScriptRef.current.remove()
		}

		const script = doc.createElement('script')
		script.src = widgetUrl
		script.dataset.containerId = containerId
		script.onerror = () => {
			if (mount.isConnected) {
				mount.replaceChildren(createLoadingError(doc))
			}
		}
		applyCommonDataset(script, therapistUuid, attributes, surface)

		if (variant === 'booking') {
			applyBookingDataset(script, attributes, selectedCategories, shouldUseConfiguredCategories)
		} else {
			applySeminarsDataset(script, attributes)
		}

		script.async = true
		widgetScriptRef.current = script
		containerRef.current.appendChild(script)
	}, [
		containerRef,
		previewId,
		variant,
		therapistUuid,
		widgetUrl,
		attributes,
		surface,
		selectedCategories,
		shouldUseConfiguredCategories
	])

	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container || container.childElementCount > 0 || !therapistUuid || !widgetUrl) {
			return
		}
		container.appendChild(
			createLoadingPlaceholder(container.ownerDocument, attributes.primaryColor || LOADING_COLOR_FALLBACK)
		)
	}, [containerRef, therapistUuid, widgetUrl, attributes.primaryColor])

	useEffect(() => {
		const timer = setTimeout(() => {
			loadWidgetPreview()
		}, 500)

		return () => clearTimeout(timer)
	}, [loadWidgetPreview])

	return { reload: loadWidgetPreview }
}
