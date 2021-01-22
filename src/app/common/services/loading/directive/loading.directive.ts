import {
	ComponentFactoryResolver,
	Directive,
	Input,
	Renderer2,
	ViewContainerRef,
} from '@angular/core'
import { hasValue, isNaB } from '@quebble/scripts'

import { ComponentInjectorClass } from '../../../classes/component-injector.class'
import { NgqLoadingComponent } from '../component/ngq-loading.component'
import { LoaderType } from '../model/loader.type'
import { LoadingService } from '../service/loading.service'

@Directive({
	selector: '[loader]',
})
export class LoadingDirective extends ComponentInjectorClass<NgqLoadingComponent> {
	@Input('blur') public blur
	@Input('loader')
	set loader(state: LoaderType) {
		if (!hasValue(state)) return
		if (Array.isArray(state) && !state.length) return

		this.initDirective()

		if (isNaB<string | string[]>(state)) {
			super.initSubscription<boolean>(state)
		} else {
			this.toggleComponent(state as boolean)
		}
	}

	constructor(
		protected loading: LoadingService,
		protected render: Renderer2,
		protected viewRef: ViewContainerRef,
		resolver: ComponentFactoryResolver,
	) {
		super(render, viewRef, resolver, loading)
	}

	protected initDirective(): void {
		super.initComponent(NgqLoadingComponent)
		this.checkPosition()
	}

	private checkPosition(): void {
		const element = this.viewRef.element.nativeElement as HTMLElement
		const parent = element.parentElement
		try {
			const position = getComputedStyle(element).position
			if (!position || position === 'static')
				this.render.setStyle(element, 'position', 'relative')
		} catch (e) {
			const position = getComputedStyle(parent).position
			if (!position || position === 'static')
				this.render.setStyle(parent, 'position', 'relative')
		}
	}

	protected toggleComponent<Y>(state: Y): void {
		super.toggleComponent(state)

		const element = this.viewRef.element.nativeElement as HTMLElement
		const parent = element.parentElement
		const func = state ? 'addClass' : 'removeClass'
		const blur = this.blur ? 'blur-' + this.blur : 'blur'
		try {
			this.render[func](element, blur)
		} catch (e) {
			this.render[func](parent, blur)
		}
	}
}
