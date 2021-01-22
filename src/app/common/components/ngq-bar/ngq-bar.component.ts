import { Component, EventEmitter, Input, Output } from '@angular/core'
import { environment } from '@quebble/environment'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { dolog, hasValue } from '@quebble/scripts'
import { NgqBarService, TransLinkService } from '@quebble/services'
import { BehaviorSubject, Observable, of, Subject } from 'rxjs'
import { filter, map, takeUntil } from 'rxjs/operators'

@Component({
	selector: 'ngq-bar',
	template: `
		<div class="ngq_bar" [class.ngq_bar-crumbs]="chunkgroup?.chunks.size > 1">
			<div class="ngq-devmode-component" *ngIf="devmode">
				<ngq-button
					icon="list"
					color="info"
					mode="micro"
					(click)="__log()"
					matTooltip="::DEV:: Log NgqBarComponent to console"
				></ngq-button>
			</div>
			<div class="ngq_bar-previous" *ngIf="current > first || current < last">
				<ngq-button
					icon="arrow-left"
					color="accent-alt"
					*ngIf="current > first"
					(click)="previous()"
				></ngq-button>
				<ngq-button
					icon="arrow-right"
					color="accent-alt"
					*ngIf="current < last"
					(click)="next()"
				></ngq-button>
			</div>

			<ng-template [ngIf]="chunkgroup?.views?.size">
				<ng-template
					[ngIf]="
						chunkview?.view?.viewkey === 'array' && !chunkview.view.operation.parent
					"
					[ngIfElse]="crumbs"
				>
					<h1 class="ngq_bar-title">
						{{ titlemap.get(chunkview.view.index) | translink }}
					</h1>
					<ngq-actions
						*ngIf="chunkview.view.operations.length"
						[operations]="chunkview.view.operations"
						[show-post]="true"
						color="accent-alt"
						(select)="doAction($event)"
					>
						<ngq-search
							class="ngq_bar-search"
							[operation]="chunkview.last.operation"
							(search)="searchValue($event)"
							*ngIf="chunkview.view.component !== 'list'"
						></ngq-search>
					</ngq-actions>
				</ng-template>

				<ng-template #crumbs>
					<ng-container
						*ngFor="let chunk of chunklist; let initial = first; let ending = last"
					>
						<div class="ngq_bar-divider" *ngIf="initial"></div>
						<span *ngIf="!initial">
							<i class="ngq_bar-split fa fa-angle-right"></i>
						</span>

						<span [loader]="chunk.operation.id">
							<!--a
								[routerLink]="chunk.chunkroute(prefix)"
								[class.ngq_bar-active]="current === last && ending"
							>
								{{ titlemap.get(chunk.index) | translink }}
							</a-->
							<div
								class="ngq_bar-link"
								[class.ngq_bar-active]="active === chunk.index"
								(click)="setActive(chunk.index)"
							>
								{{ titlemap.get(chunk.index) | translink }}
							</div>
						</span>
					</ng-container>
				</ng-template>
			</ng-template>
		</div>
	`,
	styleUrls: ['./ngq-bar.component.scss'],
	providers: [NgqBarService],
})
export class NgqBarComponent {
	@Input() public prefix: string
	@Output() public action: EventEmitter<DialogData> = new EventEmitter()
	@Output() public search: EventEmitter<
		[number, OpenApi.ParameterObject, string]
	> = new EventEmitter()

	public chunkgroup: OpenApi.ChunkGroup
	public chunkview: OpenApi.ChunkView
	public chunklist: OpenApi.Chunk[] = []

	public current: number
	public first: number
	public last: number
	public active: number

	public titles: Map<number, BehaviorSubject<any>> = new Map()
	public titlemap: Map<number, any> = new Map()

	private unsub$: Subject<void> = new Subject()

	constructor(
		private openapi: OpenApi.OpenApiService,
		private translate: TransLinkService,
		private ngqbar: NgqBarService,
	) {}

	public ngOnInit(): void {
		this.openapi.chunkgroup
			.pipe(filter((a) => !!a))
			.subscribe((group: OpenApi.ChunkGroup) => this.setupChunkGroup(group))
	}

	public previous(): void {
		this.switch(false)
	}

	public next(): void {
		this.switch(true)
	}

	public setActive(key: number): void {
		if (key === this.active) return
		const chunk = this.chunkgroup?.chunks?.get(key)
		if (chunk) {
			this.active = chunk.index
			this.openapi.chunkSwitch(chunk)
		}
	}

	/**
	 * @summary
	 * Emit the selected operation from the available ones for the current view
	 * Chunk and the operations that aren't hidden by the parent view component.
	 *
	 * @param operation Operation
	 */
	public doAction(operation: OpenApi.Operation): void {
		this.action.emit({
			operation,
			item: null,
			subject: null,
			chunk: this.chunkview.last as any,
		})
	}

	/**
	 * @summary
	 * Unified next/previous selector for the current ChunkView that determines
	 * the breadcrumbs visible in the bar.
	 *
	 * @param next toggle next or previous
	 */
	private switch(next: boolean): void {
		const method = next ? 'next' : 'previous'
		const direction = next ? this.current < this.last : this.current > this.first

		if (direction) {
			const chunkview = this.chunkgroup[method](this.current)
			const current = this.current
			this.current = chunkview?.start ?? this.current
			this.chunkview = chunkview ?? this.chunkview
			this.getTitles(current)
		}
	}

	/**
	 * @summary
	 * Setup the view based on the current ChunkGroup and the Chunks therein.
	 * Resets the bar when the ChunkGroup is updated completely. Parses each
	 * Chunk and makes a title for each Chunk.
	 *
	 * @param group Current ChunkGroup
	 *
	 * @todo
	 * Should properly handle updates to the current ChunkGroup instead of just
	 * YEETing everything. Use the titlemap differently, use the chunk's route
	 * as the key and fallback to the initial value if one's found before
	 * overwriting it.
	 */
	private setupChunkGroup(group: OpenApi.ChunkGroup): void {
		this.titles = new Map()

		const initgroup = (group: OpenApi.ChunkGroup) => {
			this.unsub$.next()
			this.unsub$.complete()

			this.openapi.resolveChunkData()

			group.chunks.forEach((chunk, key) => {
				this.titlemap.set(key, null)
			})

			this.chunkgroup = group
			this.chunkview = group.current
			this.current = group.current?.start ?? 0
			this.first = group.views.first?.start ?? 0
			this.last = group.views.last?.start ?? 0
			this.active = group.view?.index ?? -1

			this.chunklist = group.current?.chunks?.toArray()
			this.unsub$ = new Subject()

			this.getTitles(this.current)
		}

		initgroup(group)
	}

	/**
	 * @summary
	 * Get titles for all Chunks currently visible (i.e. in the ChunkView) and
	 * keep watching for changes until the ChunkView changes.
	 *
	 * @param current Chunk currently used as main view
	 *
	 * @todo
	 * Unifiy the observables maybe? This seems ... somewhat resource intensive.
	 */
	private getTitles(current: number): void {
		if (current !== this.current) {
			this.chunklist = this.chunkview.chunks.toArray()
		}

		this.unsub$.next()
		this.unsub$.complete()
		this.unsub$ = new Subject()

		this.chunklist.forEach(async (chunk) => {
			this.titleFor(chunk).pipe(takeUntil(this.unsub$)).subscribe()
		})
	}

	/**
	 * @summary
	 * Create or get a title for the current Chunk, based on the type of return
	 * value. If a Chunk's data is an array, no single title can be selected
	 * from the data. Instead, a translation is returned. If the value is an
	 * object, the Chunk datastream is used to get the right value. If the value
	 * already exists, the stored value is returned instead.
	 *
	 * @param chunk Chunk to create a title for
	 *
	 * @returns Observable with a string
	 */
	private titleFor(chunk: OpenApi.Chunk): Observable<string> {
		if (!chunk) return

		const resolve = (value: any) => {
			this.titlemap.set(chunk.index, value)
			return of(value)
		}

		const translation = this.titleTranslation(chunk.operation)
		if (chunk.schematype === 'array' && hasValue(translation)) return resolve(translation)

		const filled = chunk.viewroute(null, true).join('/')
		const barservice = this.ngqbar.get(filled)
		if (hasValue(barservice)) return resolve(barservice)

		const getoperation = chunk.datastream.pipe(
			map((result: any) => {
				if (!hasValue(result)) return null
				if (typeof result !== 'object') return null

				const value = (result?.data?.attributes ?? result)[chunk.operation.subject] ?? null
				this.ngqbar.set(filled, value)
				this.titlemap.set(chunk.index, value)
				return value
			}),
		)

		return getoperation
	}

	/**
	 * @summary
	 * Make a translation for the given Operation, based on its operation id or
	 * its schema title.
	 *
	 * @param operation Chunk Operation
	 *
	 * @returns string
	 */
	private titleTranslation(operation: OpenApi.Operation): string {
		const operationString = `operation.operationId.${operation.id}`
		const operationTL = this.translate.instant(operationString)

		if (operationString !== String(operationTL).toString()) return operationString

		const schemaName = this.openapi.stripMethodFromSchema(operation.schema)
		const schemaString = schemaName ? `schema.${schemaName}.__title` : null

		return schemaString
	}

	/**
	 * @summary
	 * Get the FontAwesome icon associated with the method
	 *
	 * @param method
	 */
	public getIcon(method: OpenApi.OperationType): string {
		switch (method) {
			case 'get':
				return 'ban'
			case 'post':
				return 'plus'
			case 'delete':
				return 'trash-o'
			case 'patch':
			case 'put':
				return 'pencil'
		}
	}

	/**
	 * @summary
	 * Emit a search value from the NgqSearchComponent, with the given search
	 * string and ParameterObject as well as the current view Chunk index.
	 *
	 * @param value Tuple [ ParameterObject, search string ]
	 */
	public searchValue(value: [OpenApi.ParameterObject, string]): void {
		this.search.emit([this.chunkview.last?.index, value[0], value[1]])
	}

	/**
	 * @extends ::DEV::
	 * @summary
	 * Dev tools
	 */
	get devmode(): boolean {
		return !environment.production
	}

	/**
	 * @extends ::DEV::
	 * @summary
	 * Log the current active component using the fancy logger and the component
	 * constructor name.
	 */
	public __log(): void {
		dolog('success', `[${this.constructor.name}]`, this)
	}
}
