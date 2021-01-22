import {
	AfterViewInit,
	Directive,
	ElementRef,
	EventEmitter,
	OnDestroy,
	OnInit,
	Output,
} from '@angular/core'
import { fromEvent, Subscription } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

declare class ResizeObserver {
	[key: string]: any
	constructor(any)

	observe: (any) => any
	disconnect: () => any
}

@Directive({
	selector: '[resize]',
})
export class ResizeDirective implements OnInit, AfterViewInit, OnDestroy {
	@Output('res-height') public height: EventEmitter<number> = new EventEmitter()
	@Output('res-width') public width: EventEmitter<number> = new EventEmitter()

	private _resize: Subscription
	private _resobs: ResizeObserver

	constructor(private elRef: ElementRef<HTMLElement>) {}

	public ngOnInit(): void {
		this._resize = fromEvent(window, 'resize')
			.pipe(debounceTime(25))
			.subscribe(() => this.calculateSizes())

		try {
			this._resobs = new ResizeObserver((entries) => {
				if (entries.length) this.calculateSizes()
			})
		} catch (e) {
			this._resobs = undefined
		}
	}

	public ngAfterViewInit(): void {
		this.calculateSizes()
		this._resobs?.observe(this.elRef.nativeElement)
	}

	public ngOnDestroy(): void {
		this._resize?.unsubscribe()
		this._resobs?.disconnect()
	}

	protected calculateSizes(): void {
		const el = this.elRef.nativeElement
		const width = el.clientWidth % 2 > 0 ? el.clientWidth - 1 : el.clientWidth
		const height = el.clientHeight

		this.width.emit(width)
		this.height.emit(height)
	}
}
