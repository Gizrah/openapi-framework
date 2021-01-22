import { hasValue } from './hasvalue'

export namespace Methods {
	// Returns scrollbar width, if any (MACOS LOOKING AT YOU)
	export const ScrollbarSize = (): number => {
		// Creating invisible container
		const outer = document.createElement('div')
		outer.style.visibility = 'hidden'
		outer.style.overflow = 'scroll' // forcing scrollbar to appear
		outer.style['msOverflowStyle'] = 'scrollbar' // needed for WinJS apps
		document.body.appendChild(outer)

		// Creating inner element and placing it in the container
		const inner = document.createElement('div')
		outer.appendChild(inner)

		// Calculating difference between container's full width and the child width
		const scrollbarWidth = outer.offsetWidth - inner.offsetWidth

		// Removing temporary elements from the DOM
		outer.parentNode.removeChild(outer)

		return scrollbarWidth
	}

	// The base for the rem
	export const FontSize = (): number => {
		const body = getComputedStyle(document.body)
		return body ? parseInt(body.fontSize.replace('px', '')) : 16
	}

	// Mutation Observer that ignores mat-ripple
	export const Observer = (element: any, mutate: (bool: boolean) => any): MutationObserver => {
		const check = (mutations: MutationRecord[]): boolean => {
			let update = false

			for (const record of mutations) {
				if (record.removedNodes.length) {
					update = true
					break
				}

				if (record.addedNodes.length) {
					for (const key in record.addedNodes) {
						const node = record.addedNodes[key] as HTMLElement
						if (
							hasValue(node.classList) &&
							!node.classList?.contains('mat-ripple-element')
						) {
							update = true
							break
						}
					}
				}
			}

			return update
		}

		const mutatable = 'MutationObserver' in window || 'WebKitMutationObserver' in window
		if (!mutatable) return

		mutate(true)

		const observer = new MutationObserver((mutations: MutationRecord[]) => {
			const update = check(mutations)
			if (update) mutate(update)
		})

		observer.observe(element, { subtree: true, childList: true })

		return observer
	}

	// Get the current value as a tuple with number and type
	export const ParseSize = (input: any): [number, string] => {
		const units = [
			'cm',
			'mm',
			'in',
			'pt',
			'pc',
			'px',
			'em',
			'ex',
			'ch',
			'rem',
			'vw',
			'vh',
			'vmin',
			'vmax',
			'%',
		]
		const num = parseFloat(input)
		const unit = units.filter((type) => input.indexOf(type) > -1)

		const size = isNaN(num) ? 0 : num
		const suffix = unit.length > 0 ? unit[0] : 'px'

		return [size, suffix]
	}
}
