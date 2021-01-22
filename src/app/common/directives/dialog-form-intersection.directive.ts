import { Directive, ElementRef, Input, OnDestroy } from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { fromEvent, Subject } from 'rxjs'
import { debounceTime, filter, takeUntil } from 'rxjs/operators'

import { hasValue } from '../scripts/hasvalue'
import { StorageService } from '../services/storage/storage.service'

@Directive({
	selector: '[dialogFormIntersect]',
})
export class DialogFormIntersectionDirective implements OnDestroy {
	@Input() set intersect(formId: string) {
		this._formId = formId
	}

	@Input('intersect-width') set width(width: any) {
		if (hasValue(width)) {
			const parsed = parseFloat(width)
			this._divide = parsed / 100
			this._width = parsed
		}
	}

	@Input('intersect-update')
	private update$: Subject<any>

	private _formId: string
	private _width: number
	private _divide: number = 1
	private destroy$: Subject<void> = new Subject()

	constructor(private storage: StorageService, private elRef: ElementRef<HTMLElement>) {}

	public ngOnInit(): void {
		fromEvent(this.elRef.nativeElement, 'scroll')
			.pipe(
				debounceTime(10),
				filter((event) => !!event?.target && this._divide !== 1 && !!this._formId),
				takeUntil(this.destroy$),
			)
			.subscribe((event: any) => {
				const target = event['target']
				const scroll = target?.scrollLeft
				const depth = Math.ceil(scroll / this._width)
				const rest = Math.ceil((scroll % this._width) / this._divide)

				this.storage.cache.set(StorageKeys.Dialog.ScrollPoll, [
					this._formId,
					depth + 1,
					rest,
				])
			})
	}

	public ngAfterViewInit(): void {
		if (this.update$)
			this.update$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
				this.elRef.nativeElement.dispatchEvent(new CustomEvent('scroll'))
			})
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}
}
