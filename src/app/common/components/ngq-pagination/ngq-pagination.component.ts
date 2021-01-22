import { Component, EventEmitter, HostBinding, Input, OnDestroy, Output } from '@angular/core'
import { Params } from '@angular/router'
import { OpenApi } from '@quebble/openapi'
import { Subject } from 'rxjs'
import { filter, map, tap } from 'rxjs/operators'

import { OpenApiPaginationService } from '../../services/openapi/service/pagination.service'

@Component({
	selector: 'ngq-pagination',
	template: `
		<div class="ngq_pagination" [class.ngq_pagination-shade]="shade">
			<ngq-button
				icon="angle-double-left"
				mode="mini"
				color="white"
				[inactive]="selected === 1"
				class="ngq_pagination-prfw"
				(click)="select(1)"
			></ngq-button>
			<ngq-button
				icon="angle-left"
				mode="mini"
				color="white"
				[inactive]="selected === 1"
				class="ngq_pagination-prfw"
				(click)="select(selected - 1)"
			></ngq-button>

			<div class="ngq_pagination-pages">
				<ng-container *ngFor="let page of pages">
					<div
						class="ngq_pagination-item"
						[class.ngq_pagination-current]="selected === page"
						mat-ripple
						[matRippleDisabled]="selected === page"
						(click)="select(page)"
					>
						{{ page }}
					</div>
				</ng-container>
			</div>

			<ngq-button
				icon="angle-right"
				mode="mini"
				color="white"
				[inactive]="selected === pages.length"
				class="ngq_pagination-prfw"
				(click)="select(selected + 1)"
			></ngq-button>
			<ngq-button
				icon="angle-double-right"
				mode="mini"
				color="white"
				[inactive]="selected === pages.length"
				class="ngq_pagination-prfw"
				(click)="select(pages.length)"
			></ngq-button>
		</div>
	`,
	styleUrls: ['./ngq-pagination.component.scss'],
})
export class NgqPaginationComponent implements OnDestroy {
	@Input() public shade: boolean = true
	@Input()
	set operation(operation: OpenApi.Operation) {
		this._operation = operation || new OpenApi.Operation()
		this.pages = [1]
		this.selected = 1
		this._params = Object.assign({})
	}

	get operation(): OpenApi.Operation {
		return this._operation
	}
	private _operation: OpenApi.Operation

	public pages: number[] = [1]
	public selected: number = 1

	private _params: { offset: number; limit: number } = Object.assign({})

	@Output()
	public page: EventEmitter<Params> = new EventEmitter()

	private destroy$: Subject<void> = new Subject()

	constructor(private pagination: OpenApiPaginationService) {}

	public ngOnInit(): void {
		this.pagination
			.stream()
			.pipe(
				filter(([operation]) => operation === this._operation.id),
				map(([operation, limit]) => {
					this._params['limit'] = limit
					return this.pagination.get(operation, limit)[0]
				}),
				tap((limit) => {
					this._params['offset'] = this.selected * this._params.limit
					this.pages = Array.from(Array(limit), (e, i) => i + 1)
				}),
			)
			.subscribe()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	public select(page: number): void {
		if (!this.pages.includes(page)) return
		if (page === this.selected) return
		this.selected = page
		this._params.offset = (page - 1) * this._params.limit
		this.page.emit(this._params)
	}

	@HostBinding('style.display')
	get __componentStyle(): string {
		return this.pages.length === 1 ? 'none' : 'flex'
	}
}
