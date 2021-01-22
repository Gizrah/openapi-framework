import { Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core'
import { hasValue, Methods } from '@quebble/scripts'
import Masonry from 'masonry-layout'
import { fromEvent } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

interface MasonryOptions {
	itemSelector: string
	gutter: number
	fitWidth: boolean
	transitionDuration: string
	horizontalOrder: boolean
}

interface SelfStatus {
	element: HTMLElement
	offsetWidth: number | string
	offsetHeight: number | string
}

@Directive({
	selector: '[masonry]',
})
export class MasonryDirective implements OnDestroy {
	@Input() public masonry: string = '.list-'
	@Input() public columns: number = 3

	private _fontsize: number = Methods.FontSize()
	private _options: MasonryOptions
	private _observer: MutationObserver
	private _resize: any
	private _masonry: Masonry
	private _self: SelfStatus

	constructor(private elRef: ElementRef<HTMLElement>, private render: Renderer2) {}

	public ngAfterViewInit(): void {
		const check = hasValue(this.masonry) ? this.masonry : '.list-'
		const prefix = check.charAt(0) === '.' ? check : '.' + check

		this._options = {
			itemSelector: `${prefix}${this.columns}`,
			gutter: this._fontsize,
			fitWidth: false,
			transitionDuration: '0.1s',
			horizontalOrder: false,
		}

		this.primeSubscriptions()
	}

	public ngOnDestroy(): void {
		this._observer?.disconnect()
		this._masonry?.destroy()
		this._resize?.unsubscribe()
	}

	private primeSubscriptions(): void {
		this._observer = Methods.Observer(this.elRef.nativeElement, (state) => {
			if (state) this.calculateWidth()
			else this.updateChildren()
		})

		this._resize = fromEvent(window, 'resize')
			.pipe(debounceTime(10))
			.subscribe(() => this.updateChildren())
	}

	private updateChildren(): void {
		const el = this.elRef.nativeElement
		if (!this._self) {
			this._self = {
				element: el,
				offsetHeight: el.offsetHeight,
				offsetWidth: el.offsetWidth,
			}

			return this.calculateWidth()
		}

		const { offsetHeight, offsetWidth } = this._self
		if (offsetHeight !== el.offsetHeight || offsetWidth !== el.offsetWidth) {
			this._self.offsetHeight = el.offsetHeight
			this._self.offsetWidth = el.offsetWidth
			return this.calculateWidth()
		}
		return
	}

	private calculateWidth(): void {
		if (!this._options) return

		const el = this.elRef.nativeElement
		const width = el.clientWidth % 2 > 0 ? el.clientWidth - 1 : el.clientWidth
		const fontsize = Methods.FontSize()
		const computed = window.getComputedStyle(el)
		const first = el.firstElementChild as HTMLElement
		if (!first) return
		const firstcomp = first ? window.getComputedStyle(first) : null

		const marginL = parseInt(firstcomp?.marginLeft ?? '0')
		const marginR = parseInt(firstcomp?.marginRight ?? '0')
		const margins = marginL + marginR
		const paddingL = parseInt(computed.paddingLeft)
		const paddingR = parseInt(computed.paddingRight)
		const paddings = paddingL + paddingR

		const spacing = margins + paddings

		const cols = this.columnCount(width)
		const gap = (cols - 1) * fontsize
		const sum = (width - spacing - gap) / cols

		for (const key in el.children) {
			const child = el.children[key] as HTMLElement
			if (hasValue(child.classList)) {
				this.render.setStyle(child, 'width', `${sum}px`)
			}
		}

		if (!this._masonry) this._masonry = new Masonry(el, this._options)
		else this._masonry.reloadItems()
		this._masonry.layout()
	}

	private columnCount(width: number): number {
		const number = parseInt(this.columns as any)
		if (width > 5120) {
			if (number === 3) return 8
			if (number === 4) return 12
		}
		if (width > 3820) {
			if (number === 3) return 6
			if (number === 4) return 10
		}
		if (width > 2560) {
			if (number === 3) return 5
			if (number === 4) return 8
		}
		if (width > 1800) {
			if (number === 3) return 4
			if (number === 4) return 5
		}
		if (width > 1200) {
			if (number === 3) return 3
			if (number === 4) return 4
		}
		if (width > 900) {
			if (number === 3) return 2
			if (number === 4) return 3
		}
		if (width > 600) return 2
		if (width < 599) return 1
	}
}
