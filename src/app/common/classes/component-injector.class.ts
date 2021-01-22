import {
	ComponentFactory,
	ComponentFactoryResolver,
	ComponentRef,
	Injectable,
	OnDestroy,
	Renderer2,
	ViewContainerRef,
} from '@angular/core'
import { isEqual } from 'lodash-es'
import { BehaviorSubject, Subject, Subscription } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

import { StateServiceClass } from './state-service.class'

@Injectable()
export abstract class ComponentInjectorClass<T> implements OnDestroy {
	protected _component: ComponentRef<T>
	private _factory: ComponentFactory<T>

	private current$: BehaviorSubject<any> = new BehaviorSubject(null)

	private _watchlist: string | string[]
	private sub$: Subscription
	private destroy$ = new Subject<void>()

	constructor(
		protected render: Renderer2,
		protected viewRef: ViewContainerRef,
		private resolver: ComponentFactoryResolver,
		protected service: StateServiceClass,
	) {}

	get current(): any {
		return this.current$.getValue()
	}

	set current(input: any) {
		this.current$.next(input)
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
		this.destroyComponent()
	}

	protected initSubscription<Y>(watchlist: string | string[]): void {
		if (!watchlist || (isEqual(this._watchlist, watchlist) && this.sub$)) return
		if (this.sub$) {
			this.sub$.unsubscribe()
			this.sub$ = null
		}

		this._watchlist = watchlist
		this.sub$ = this.service
			.get(watchlist)
			.pipe(takeUntil(this.destroy$))
			.subscribe((message: Y) => this.toggleComponent<Y>(message))
	}

	protected toggleComponent<Y>(input: Y): void {
		this.current = input as Y
		if (input) this.addComponent()
		else this.destroyComponent()
	}

	private addComponent(): void {
		if (this._component && this._component.instance) return
		this._component = this.viewRef.createComponent(this._factory)

		const element = this._component.location.nativeElement as HTMLElement
		const parent = this.viewRef.element.nativeElement as HTMLElement

		try {
			this.render.appendChild(parent, element)
			this.render.insertBefore(parent, element, parent.firstChild)
		} catch (e) {
			const upone = parent.parentElement
			this.render.appendChild(upone, element)
			this.render.insertBefore(upone, element, upone.firstChild)
		}
	}

	private destroyComponent(): void {
		if (this._component) {
			this._component.destroy()
			this._component = null
		}
	}

	protected initComponent(component: any): void {
		if (this._factory) return
		this._factory = this.resolver.resolveComponentFactory(component)
	}
}
