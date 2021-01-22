import { filter, first, switchMap } from 'rxjs/operators'

import { Injectable } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { StorageKeys } from '@quebble/consts'
import { ResponseEventType } from '@quebble/enums'
import { List } from '@quebble/models'
import { StateServiceClass } from 'app/common/classes/state-service.class'
import { NgqSnackbarComponent } from 'app/common/components/ngq-snackbar/ngq-snackbar.component'

import { HttpError } from '../../interceptor/model/httperror.model'
import { OperationId } from '../../openapi/barrel'
import { StorageService } from '../../storage/storage.service'
import { TransLinkService } from '../../translation/service/translink.service'
import { ResponseModel } from '../model/response.model'

export interface ResponseEvent {
	status: string | number
	type?: ResponseEventType
}

@Injectable({
	providedIn: 'root',
})
export class ResponseService extends StateServiceClass {
	private _params = new RegExp(/({{\s?[\w]+\s?}})+/gi)

	/**
	 * List of active error status codes that should block user interaction.
	 * If there's even one event in this list, user interaction must
	 * be blocked.
	 */
	private _blockingErrors = new List<ResponseEvent>()

	constructor(
		private translate: TransLinkService,
		private storage: StorageService,
		private snackbar: MatSnackBar,
	) {
		super()
		this.setupGlobalEvents()
	}

	/**
	 * Subscribe to the storage cache for global events.
	 * When a global event occurs, it causes the snackbar to be displayed.
	 */
	private setupGlobalEvents(): void {
		this.storage.cache
			.get<ResponseEvent>(StorageKeys.Response.Global)
			.pipe(filter((val) => !!val))
			.subscribe((event) => this.handleGlobalEvent(event))
	}

	/**
	 * Show the snackbar when a response event occurs.
	 * This notifies the user something happened or went wrong.
	 * @param event The event that has occured.
	 */
	public handleGlobalEvent(event: ResponseEvent) {
		event.type = event.type ?? this.getResponseEventType(event.status)
		switch (event.status) {
			case 'online':
				this.removeResponseEvent(event.status)
				break
			default:
				this._blockingErrors.add(event)
				break
		}

		this.setBlockingStatus()
	}

	public handleErrorEvent(event: ResponseEvent, params: Record<string, any> = {}): void {
		event.type = event.type ?? this.getResponseEventType(event.status)
		this.showSnackbar(event, params, true)
	}

	public showSnackbar(
		event: ResponseEvent,
		params: Record<string, any> = {},
		closable?: boolean,
	) {
		this.snackbar.openFromComponent(NgqSnackbarComponent, {
			data: {
				event,
				params,
				closable,
			},
			panelClass: ['ngq_snackbar'],
			horizontalPosition: 'left',
		})
	}

	public removeResponseEvent(status: string | number): void {
		this._blockingErrors.delete((event) => event.status === status)
		this.setBlockingStatus()
	}

	private setBlockingStatus(): void {
		if (this._blockingErrors.size) {
			this.showSnackbar(this._blockingErrors.last)
		} else {
			this.snackbar.dismiss()
		}

		this.storage.cache.set<boolean>(
			StorageKeys.Response.BlockEvents,
			this._blockingErrors.size > 0,
		)
	}

	public update(
		operationId: OperationId,
		message: string | HttpError | ResponseModel,
		type?: string,
	): void {
		if (!operationId) return
		if (!message) return
		if (message instanceof ResponseModel) return this.set(operationId, message)
		const model = new ResponseModel()

		if (typeof message === 'string') {
			model.message = message
			model.type = (type as ResponseEventType) || ResponseEventType.INFO

			const operationtl = `operation.operationId.${operationId}`
			const instant = this.translate.instant(message)
			if (instant !== message) {
				if (this._params.test(instant)) {
					this.translate.get(operationtl).subscribe((optl) => {
						model.params = { operationId: optl }
						this.set(operationId, model)
					})
				}
			} else {
				this.set(operationId, model)
			}
		}

		if (message instanceof HttpError) {
			model.type = this.getResponseEventType(message.error.status)

			const operationtl = `operation.operationId.${operationId}`
			const typetl = `response.type.${model.type}`
			const methodtl = `operation.operationType.${message.method.toLowerCase()}`
			const reasontl = `response.error.${message.error.status}`

			this.translate
				.get([operationtl, typetl, methodtl, reasontl])
				.pipe(
					switchMap((keys: any) =>
						this.translate.get('response.construct.operation', {
							operationId: keys[operationtl],
							operationType: keys[methodtl],
							ResponseEventType: keys[typetl],
							reason: keys[reasontl] === reasontl ? '' : keys[reasontl],
						}),
					),
					first(),
				)
				.subscribe((message: string) => {
					model.message = message
					this.set(operationId, model)
				})
		}
	}

	/**
	 *
	 * @param status map the http status to a specific response type
	 * @returns ResponseEventType
	 */
	private getResponseEventType(status: number | string): ResponseEventType {
		const parsed = parseInt(String(status).charAt(0))
		const f = isNaN(parsed) ? status : parsed

		switch (f) {
			case 1:
			case 2:
			case 'online':
				return ResponseEventType.SUCCESS
			case 3:
				return ResponseEventType.WARNING
			case 4:
			case 5:
			case 'offline':
			case 'json-error':
			case 'json-invalid':
			default:
				return ResponseEventType.ERROR
		}
	}
}
