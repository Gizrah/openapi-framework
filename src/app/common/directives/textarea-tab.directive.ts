import { Directive, ElementRef, Renderer2 } from '@angular/core'
import { Subscription } from 'rxjs'

@Directive({
	selector: '[textarea-tab]',
})
export class TextareaTabDirective {
	private event$: Subscription
	constructor(private elRef: ElementRef<HTMLTextAreaElement>, private render: Renderer2) {}

	public ngOnInit(): void {
		const el = this.elRef?.nativeElement
		if (el?.tagName?.toUpperCase() !== 'TEXTAREA') return

		this.render.setStyle(el, 'tab-size', 2)
		el.addEventListener('keydown', this.onKeyDown)
	}

	public ngOnDestroy(): void {
		const el = this.elRef?.nativeElement
		el.removeEventListener('keydown', this.onKeyDown)
		this.render.removeStyle(el, 'tab-size')
	}

	private onKeyDown(event: KeyboardEvent) {
		const el = this as any // eslint-disable-line
		const { key } = event
		const { selectionStart, selectionEnd } = el

		if (key === 'Enter') {
			if (selectionStart === selectionEnd) {
				event.preventDefault()

				let sel = selectionStart
				let chars = 0
				const end = selectionEnd
				const start = selectionStart
				const text = el.value

				while (sel > 0 && text[sel - 1] !== '\n') sel--

				const first = sel
				while (text[sel] === ' ' || text[sel] === '\t') {
					if (text[sel] === ' ') chars++
					else chars += 2
					sel++
				}

				if (sel > first) {
					const tabs = () => {
						let val = ''
						const ts = chars / 2 - (chars % 2)
						for (let i = 0; i < ts; i++) {
							val += '\t'
						}
						return val
					}

					const addtabs = tabs()
					const ss = text.substr(0, start)
					const se = text.substr(end)
					const newtext = `${ss}\n${addtabs}${se}`
					el.value = newtext

					el.selectionStart = start + addtabs.length + 1
					el.selectionEnd = end + addtabs.length + 1
					el.blur()
					el.focus()
					return false
				}
			}
		}

		if (key === 'Tab' && !event.shiftKey) {
			event.preventDefault()
			if (selectionStart === selectionEnd) {
				const text = el.value
				if (text.length === selectionEnd) el.value = text + '\t'
				else {
					const start = selectionStart
					const end = selectionEnd
					const text = el.value

					el.value = text.substr(0, start) + '\t' + text.substr(end)
					el.selectionStart = start + 1
					el.selectionEnd = end + 1
				}
			} else {
				let start = selectionStart
				let end = selectionEnd
				const text = el.value

				while (start > 0 && text[start - 1] !== '\n') start--
				while (end > 0 && text[end - 1] !== '\n' && end < text.length) end++

				const lines = text.substr(start, end - start).split('\n')
				for (let i = 0; i < lines.length; i++) {
					if (i === lines.length - 1 && lines[i].length === 0) continue
					lines[i] = '\t' + lines[i]
				}

				el.value = text.substr(0, start) + lines + text.substr(end)
				el.selectionStart = start
				el.selectionEnd = end
			}

			return false
		}

		return true
	}
}
