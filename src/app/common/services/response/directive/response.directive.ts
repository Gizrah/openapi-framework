import {
	ComponentFactoryResolver,
	Directive,
	Input,
	Renderer2,
	ViewContainerRef,
} from '@angular/core'
import { ResponseEventType } from '@quebble/enums'
import { hasValue } from '@quebble/scripts'

import { ComponentInjectorClass } from '../../../classes/component-injector.class'
import { NgqResponseComponent } from '../component/ngq-response.component'
import { ResponseModel } from '../model/response.model'
import { ResponseService } from '../service/response.service'

@Directive({
	selector: '[response]',
})
export class ResponseDirective extends ComponentInjectorClass<NgqResponseComponent> {
	@Input('response')
	set watch(operationIds: string | string[]) {
		if (!hasValue(operationIds)) return

		this.initDirective()
		super.initSubscription<ResponseModel>(operationIds)
	}

	@Input()
	set mode(type: ResponseEventType) {
		this._type = type
		if (type) {
			if (this.current) {
				this.current.type = type
			}
		}
	}

	@Input() set message(content: any) {
		this._message = content
		if (content) this.createUnwatched()
		else this.toggleComponent(null)
	}

	private _type: ResponseEventType
	private _message: any

	constructor(
		protected response: ResponseService,
		protected render: Renderer2,
		protected viewRef: ViewContainerRef,
		resolver: ComponentFactoryResolver,
	) {
		super(render, viewRef, resolver, response)
	}

	protected initDirective(): void {
		super.initComponent(NgqResponseComponent)
	}

	protected toggleComponent<ResponseModel>(state: ResponseModel): void {
		super.toggleComponent(state)
		if (state) {
			this._component.instance.setMessage(state as any)
		}
	}

	private createUnwatched(): void {
		this.initDirective()

		setTimeout(() => {
			const model = new ResponseModel()

			model.type = this._type
			model.message = this._message

			this.toggleComponent(model)
		}, 150)
	}
}
