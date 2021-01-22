import {
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostBinding,
	Input,
	Renderer2,
	SimpleChanges,
	ViewChild,
} from '@angular/core'
import { hasValue, isGuid, isLink, Methods } from '@quebble/scripts'

@Component({
	selector: 'ngq-avatar',
	template: `
		<div
			class="ngq_avatar"
			[class.ngq_avatar-hover]="!!hover"
			[class.ngq_avatar-selected]="!!state"
		>
			<ng-template [ngIf]="avatar" [ngIfElse]="noImage">
				<div class="ngq_avatar-image" #inView [class.preload]="!contentInit">
					<img [src]="avatar" />
				</div>
			</ng-template>

			<ng-template #noImage>
				<div class="ngq_avatar-icon" #inView [class.preload]="!contentInit">
					<ng-container [ngSwitch]="gender">
						<i class="fa fa-user" *ngSwitchCase="0"></i>
						<i class="fa fa-male" *ngSwitchCase="1"></i>
						<i class="fa fa-female" *ngSwitchCase="2"></i>
						<i class="fa fa-genderless" *ngSwitchCase="3"></i>
						<i class="fa fa-{{ fallback || 'user-circle-o' }}" *ngSwitchDefault></i>
					</ng-container>
				</div>
			</ng-template>
		</div>
	`,
	styleUrls: ['./ngq-avatar.component.scss'],
})
export class NgqAvatarComponent {
	@Input() set avatar(image: string) {
		if (hasValue(image)) {
			if (isLink(image)) {
				this._avatar = image
			}
		} else {
			if (isGuid(image)) {
				this._avatar = undefined
			}
		}
	}
	get avatar(): string {
		return this._avatar
	}
	@Input() public gender: string
	@Input() public iconsize: string
	@Input() public fallback: string
	@Input() public hover: boolean
	@Input() public state: boolean
	@Input() set radius(value: string) {
		if (value) {
			this._radius = value
		}
	}

	@Input() set size(size: any) {
		if (size) {
			const justInt = parseFloat(size)
			const clean = String(size).replace(String(justInt), '')
			if (!clean.length) this._size = [size, 'em']
			else this._size = Methods.ParseSize(size)

			this._sizes = this._size.join('')
		}
	}
	get size(): any {
		return this._sizes
	}

	@ViewChild('inView', { static: false })
	set __radius(element: ElementRef<HTMLElement>) {
		this._contentInit = false
		this._inview = element

		if (element) {
			const el = element.nativeElement
			if (this.iconsize) {
				this.render.setStyle(el, 'font-size', Methods.ParseSize(this.iconsize).join(''))
			}
			if (this._radius !== '100%') this.render.setStyle(el, 'border-radius', this._radius)

			this._contentInit = true
		}

		this.cdRef.detectChanges()
	}

	@HostBinding('style')
	get __componentStyle(): string {
		return `width: ${this.size}; height: ${this.size};`
	}

	private _contentInit: boolean = false
	private _avatar: string
	private _size: [number, string] = [3, 'em']
	private _sizes: string
	private _radius: string = '100%'
	private _inview: ElementRef<HTMLElement>

	constructor(private render: Renderer2, private cdRef: ChangeDetectorRef) {}

	get contentInit(): boolean {
		return this._contentInit
	}

	public ngOnChanges(changes: SimpleChanges): void {
		if ('iconsize' in changes) {
			this.updateIconSize()
		}
	}

	private updateIconSize(): void {
		const el = this._inview?.nativeElement
		if (!el) return
		if (!this.iconsize) return

		this.render.setStyle(el, 'font-size', Methods.ParseSize(this.iconsize).join(''))
	}
}
