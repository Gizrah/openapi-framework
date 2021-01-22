import { Component, HostBinding, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { ActivatedRoute, Params } from '@angular/router'
import { FadeInAnimation } from '@quebble/animations'
import { NgqRestDialogComponent } from '@quebble/dialogs'
import { environment } from '@quebble/environment'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { dolog, hasValue } from '@quebble/scripts'
import { OpenApiService } from '@quebble/services'
import { Observable, of, Subject } from 'rxjs'
import { defaultIfEmpty, filter, first, takeUntil } from 'rxjs/operators'

@Component({
	selector: 'ngq-view',
	animations: [...FadeInAnimation],
	template: `
		<ngq-bar
			[prefix]="prefix"
			(action)="doDialog($event)"
			(search)="doSearch($event)"
		></ngq-bar>

		<ngq-tiles
			*ngIf="component === 'tiles'"
			[array]="array$ | async"
			[chunk]="chunk"
			[loader]="loader"
			(dialog)="doDialog($event)"
			(page)="doPage($event)"
			[@fadeIn]
			#activeComponent
		></ngq-tiles>

		<ngq-overview-list
			*ngIf="component === 'list'"
			[array]="array$ | async"
			[chunk]="chunk"
			(dialog)="doDialog($event)"
			(page)="doPage($event)"
			(search)="doSearch($event)"
			[@fadeIn]
			#activeComponent
		></ngq-overview-list>

		<ngq-sidebar-cards
			*ngIf="component === 'details'"
			[header]="header$ | async"
			[array]="array$ | async"
			[object]="object$ | async"
			[chunk]="chunk"
			(dialog)="doDialog($event)"
			[@fadeIn]
			#activeComponent
		></ngq-sidebar-cards>

		<ngq-family
			*ngIf="component === 'person'"
			[array]="array$ | async"
			[object]="object$ | async"
			[chunk]="chunk"
			[loader]="loader"
			(dialog)="doDialog($event)"
			[@fadeIn]
			#activeComponent
		></ngq-family>

		<div class="ngq-devmode-component" *ngIf="devmode">
			<ngq-button
				icon="list"
				color="info"
				mode="mini"
				(click)="__log()"
				matTooltip="::DEV:: Log active component"
			></ngq-button>
		</div>
	`,
	styleUrls: ['./ngq-view.component.scss'],
})
export class NgqViewComponent implements OnInit, OnDestroy {
	@ViewChild('activeComponent', { static: false }) private _activeComponent

	public loader: boolean | string[] = true
	public operation: OpenApi.Operation = new OpenApi.Operation()
	public operations: OpenApi.Operation[] = []

	public component: OpenApi.ViewType
	public chunk: OpenApi.Chunk

	private _route: OpenApi.Route = []
	private _searching: boolean = false
	private _params: Params
	private _group: OpenApi.ChunkGroup

	public prefix: string = 'view'
	public object$: Observable<any>
	public array$: Observable<any[]>
	public header$: Observable<any>

	private destroy$: Subject<void> = new Subject()

	constructor(
		private active: ActivatedRoute,
		private openapi: OpenApiService,
		private dialog: MatDialog,
	) {}

	public ngOnInit(): void {
		this.setupChunkGroup()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	private setupChunkGroup() {
		this.openapi.viewchunk
			.pipe(
				filter((a) => !!a),
				takeUntil(this.destroy$),
			)
			.subscribe((chunk) => {
				const loaderset = new Set<string>()

				this.cleanSubs()

				chunk.viewchunks?.forEach((vc) => {
					loaderset.add(vc.operation?.id)
					this[vc.viewkey + '$'] = vc.datastream
				})

				this.loader = Array.from(loaderset)

				this.component = chunk.component
				this.chunk = chunk
				this.operation = chunk.operation
				this.operations = chunk.operations
			})
	}

	private cleanUp(): void {
		this.cleanSubs()

		this.component = undefined
		this._params = undefined
		this._group = undefined
	}

	private cleanSubs(): void {
		this.array$ = of().pipe(defaultIfEmpty(null))
		this.object$ = of().pipe(defaultIfEmpty(null))
		this.header$ = of().pipe(defaultIfEmpty(null))
	}

	/**
	 * @todo
	 * Remove all of the getRouteData^ methods and move functionality to the
	 * OpenApiRouteService
	 */
	private getRouteData(params: Params = this._params, force?: boolean): void {
		if (!this.chunk?.operation?.id) {
			this.cleanUp()
			return
		}

		this.chunk?.viewchunks?.forEach((chunk: OpenApi.Chunk, type: any) =>
			this.getRouteDataForChunk(chunk, type, params, force),
		)
	}

	private getRouteDataForChunk(chunk: OpenApi.Chunk, type: any, params: Params, force?: boolean) {
		const [stream, newparams] = this.openapi.resolveChunkOperation(
			chunk,
			type,
			params,
			this._params,
			force,
		)
		this._params = newparams
		this[type + '$'] = stream
	}

	private getRouteDataForType(viewoptype: OpenApi.SchemaType, params: Params): void {
		const chunk = this.chunk.viewchunks.get(viewoptype)
		if (!chunk) return

		this.getRouteDataForChunk(chunk, viewoptype, params, true)
	}

	/**
	 * @todo
	 * Refactor to use OpenApiRouteService
	 */
	public doDialog(action: DialogData): void {
		if (!action) return

		const { operation, item, subject, chunk } = action

		const dialog = this.dialog.open(NgqRestDialogComponent, {
			data: {
				operation,
				item,
				subject,
				chunk,
				valueMap: this._group.current.values,
			},
		})

		dialog.afterClosed().subscribe((closed) => {
			if (operation.type === 'delete') {
				// this.openapi.chunkNavigation(this.active, chunk, operation, null)
				this.openapi.chunkNavigation(chunk, null, false, true)
			} else {
				if (closed) this.getRouteData(this._params, true)
			}
		})
	}

	/**
	 * @todo
	 * Refactor to use OpenApiRouteService
	 */
	public doSearch(event: [number, OpenApi.ParameterObject, string]): void {
		const key = event[0]
		const chunk = this._group.chunks.get(key)
		if (!chunk) return

		this._searching = hasValue(event[2], true)

		// TODO:
		// Store search and/or pagination params
		// return last pagination params if no search

		if (!this._searching) {
			this.getRouteDataForChunk(chunk, chunk.viewkey, {})
			return
		}

		const query = event[1].name
		const value = event[2]

		this.getRouteDataForChunk(chunk, chunk.viewkey, { [query]: value })
	}

	/**
	 * @todo
	 * Refactor to use OpenApiRouteService, as well as JSONApi
	 */
	public doPage(input: [OpenApi.SchemaType, Params]): void {
		const [type, page] = input ?? [null, null]
		this.getRouteDataForType(type, page)
	}

	@HostBinding('class.ngq-ancestor')
	public __componentClass: boolean = true

	/**
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
		if (this._activeComponent) {
			const name = this._activeComponent?.constructor?.name
			if (name) dolog('success', name, this._activeComponent)
			else dolog('success', `[${this.component}]`)
		} else {
			dolog('warning', 'No active component')
			dolog('info', '[NgqViewComponent]', this)
		}
	}

	/**
	 * @extends ::DEV::
	 * @summary
	 * Trigger a dialog to open. Change the `method` constant to the desired
	 * REST method to change the content of the dialog. If `'post'` is used, the
	 * content will be empty. If any change method is used, the dialog will wait
	 * before the data has been loaded before opening.
	 */
	private async __dialog(): Promise<void> {
		// Comment to enable
		return

		// Change this to the REST method desired (post, put, patch, delete)
		// for the dialog content
		const method = 'patch'

		const obj = this.chunk.viewchunks.get('object')
		const header = this.chunk.viewchunks.get('header')
		const array = this.chunk.viewchunks.get('array')

		const chunk = header && !obj ? header : obj ?? array
		if (!chunk) return

		// ::DEV::
		// Trigger opening of dialog after a certain time has passed, with
		// the required action constants
		if (!environment.production) {
			const dodialog = (operation, item, chunk) => {
				this.dialog.closeAll()

				const subject = operation.type === 'post' ? null : item[op.subject]

				setTimeout(() => {
					const action = {
						operation,
						item,
						subject,
						chunk,
					}
					this.doDialog(action)
				}, 150)
			}

			const op = chunk.operations.find((item) => item.type === method)
			if (!op) return

			if (op?.type !== 'post') {
				chunk.datastream
					?.pipe(
						filter((data) => !!data),
						first(),
					)
					.subscribe((data) => {
						dodialog(op, data, chunk)
					})
			} else {
				dodialog(op, {}, chunk)
			}
		}
	}
}
