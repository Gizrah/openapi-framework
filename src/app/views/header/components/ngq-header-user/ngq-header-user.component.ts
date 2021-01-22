import { filter, switchMap, takeUntil } from 'rxjs/operators'

import { Component, ElementRef, HostBinding, OnInit, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { FadeInAnimation, FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { environment } from '@quebble/environment'
import { OpenApi } from '@quebble/openapi'
import { childOf, faker, hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { Subject } from 'rxjs'

interface UserMenuItem {
	icon: string
	subject: string
	info?: string
	action?: string
	color?: string
}

@Component({
	selector: 'ngq-header-user',
	animations: [...FadeInOutAnimation, ...FadeInAnimation],
	template: `
		<div class="ngq_header_user">
			<div class="ngq_header_user-menu ripple-color" [class.menu-active]="menu" #userMenu>
				<ng-template [ngIf]="loggedin || (!loggedin && !ready && devmode)">
					<ng-container *ngTemplateOutlet="isLoggedIn"></ng-container>
				</ng-template>

				<ng-template [ngIf]="!loggedin && ready">
					<ng-container *ngTemplateOutlet="isLoggedOut"></ng-container>
				</ng-template>

				<ng-template [ngIf]="menu">
					<div class="ngq_header_user-menuitems" [@fadeIn]>
						<ng-container *ngFor="let items of menuitems">
							<div class="ngq_header_user-seperator" [@fadeIn]></div>
							<ng-container *ngFor="let item of items">
								<div
									class="ngq_header_user-menuitem"
									(click)="doAction(item.action)"
									mat-ripple
								>
									<span class="first button-icon-{{ item.color || 'grey-alt' }}">
										<i class="fa fa-{{ item.icon }}"></i>
									</span>
									<span class="second button-content-primary-alt">
										{{ item.subject | translink }}
									</span>
								</div>

								<div class="ngq_header_user-info" *ngIf="item.info">
									{{ item.info | translink }}
								</div>
							</ng-container>
						</ng-container>
					</div>
				</ng-template>
			</div>
		</div>

		<ng-template #isLoggedIn>
			<div class="ngq_header_user-current" (click)="doMenu()">
				<div class="ngq_header_user-name" *ngIf="user && menu" [@fadeInOut]>
					<label class="accent">
						{{ user.firstName || '' }} {{ user.lastName || '' }}
					</label>
					<span>{{ user.email || '' }}</span>
				</div>

				<div class="ngq_header_user-avatar">
					<ngq-avatar
						[avatar]="avatar"
						[fallback]="!avatar ? fallback : undefined"
						[iconsize]="menu ? '1.5em' : '1em'"
						[size]="menu ? '3em' : '1.75em'"
					></ngq-avatar>
				</div>

				<div class="ngq_header_user-dev-random" *ngIf="_random">
					<i class="fa fa-asterisk"></i>
				</div>
				<div class="ngq_header_user-dev-loading" *ngIf="_loading">
					<i class="fa fa-hourglass-2"></i>
				</div>
			</div>
		</ng-template>

		<ng-template #isLoggedOut>
			<ng-template [ngIf]="ready">
				<div
					class="ngq_header_user-avatar ripple-color bg-info"
					[matTooltip]="'system.login.loggedout' | translink"
					mat-ripple
					(click)="doLogin()"
				>
					<ngq-avatar fallback="lock" size="1.75em"></ngq-avatar>
				</div>
			</ng-template>
			<ng-template [ngIf]="!ready">
				<div class="ngq_header_user-avatar bg-error">
					<ngq-avatar fallback="warning" size="1.75em"></ngq-avatar>
				</div>
			</ng-template>
		</ng-template>
	`,
	styleUrls: ['./ngq-header-user.component.scss'],
})
export class NgqHeaderUserComponent implements OnInit {
	@ViewChild('userMenu', { static: false }) private _userMenu: ElementRef<Node>

	public menu: boolean = false
	public menuitems: UserMenuItem[][] = []

	private _avatar: string
	private _user: Keycloak.KeycloakProfile
	private _loggedin: boolean = false
	private _ready: boolean = false

	private destroy$: Subject<void> = new Subject()

	constructor(
		private openapi: OpenApi.OpenApiService,
		private router: Router,
		private storage: StorageService,
	) {}

	get user(): Keycloak.KeycloakProfile {
		return this._user
	}

	get avatar(): string {
		return this._avatar
	}

	get loggedin(): boolean {
		return this._loggedin
	}

	get ready(): boolean {
		return this._ready
	}

	get fallback(): string {
		return this.devmode ? 'code' : 'warning'
	}

	public ngOnInit(): void {
		this.createMenuItems()

		this.openapi.update
			.pipe(
				filter((state) => {
					this._ready = state
					if (!state && this.devmode) {
						this._user = {
							firstName: 'Developer Mode',
							email: 'Enabled debugging',
						}
					}
					return !!state
				}),
				switchMap(() => this.openapi.loggedin()),
				takeUntil(this.destroy$),
			)
			.subscribe((state) => {
				this._loggedin = state
				if (state) this.getUser()
				else this._user = undefined
			})

		this.storage.cache
			.get(StorageKeys.Document.Click)
			.pipe(
				filter((el: Node) => !childOf(this._userMenu?.nativeElement, el, true)),
				takeUntil(this.destroy$),
			)
			.subscribe(() => {
				this.menu = false
			})
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	private async getUser(): Promise<void> {
		const user = this._user ?? (await this.openapi.user)
		this._user = user

		this.setAvatar()
		this.createMenuItems()
	}

	private setAvatar(): void {
		if (this._user && this._user.firstName !== 'Developer Mode') {
			const image = faker.image.business(50, 50)
			this._avatar = image
		} else {
			this._avatar = undefined
		}
	}

	private createMenuItems(): void {
		const logout: UserMenuItem = {
			icon: 'sign-out',
			subject: 'common.usermenu.logout.__title',
			info: null,
			action: 'doLogout',
			color: 'grey-alt',
		}

		const settings: UserMenuItem = {
			icon: 'cog',
			subject: 'common.usermenu.settings.__title',
			info: null,
			action: null,
			color: 'warning-alt',
		}

		const reload: UserMenuItem = {
			icon: 'repeat',
			subject: 'common.usermenu.dev.reload.__title',
			info: 'common.usermenu.dev.reload.__message',
			action: '__reload',
			color: 'info-alt',
		}

		const loaders: UserMenuItem = {
			icon: this._loading ? 'hourglass-2' : 'hourglass-o',
			subject: 'common.usermenu.dev.loaders.__title',
			info: 'common.usermenu.dev.loaders.__message',
			action: '__loading',
			color: this._loading ? 'success-alt' : 'grey-alt',
		}

		const random: UserMenuItem = {
			icon: 'asterisk',
			subject: 'common.usermenu.dev.random.__title',
			info: 'common.usermenu.dev.random.__message',
			action: '__random',
			color: this._random ? 'success-alt' : 'grey-alt',
		}

		if (this.devmode) {
			const base = [random, loaders, reload]
			let items = [base]
			if (this._user) items = [[settings], base, [logout]]
			this.menuitems = items
		} else {
			this.menuitems = this._user ? [[settings, logout]] : []
		}
	}

	public doAction(action: string): void {
		if (hasValue(action)) {
			if (action in this) this[action]()
		}
	}

	public doMenu(): void {
		this.menu = !this.menu
	}

	public doLogin(): void {
		if (!this._ready) return
		const url = window.location.href.split('#')[0]

		this.openapi.login({ redirectUri: url })
	}

	public doLogout(): void {
		this.router.navigate(['/'])
		this.menu = false
		this._user = undefined
		this._loggedin = false

		setTimeout(() => this.openapi.logout())
	}

	// ::DEV::
	get devmode(): boolean {
		// return !environment.production
		return true
	}

	public __reload(): void {
		this.openapi.__reload()
	}

	public _loading: boolean = false
	public __loading(): void {
		this._loading = !this._loading
		this.openapi.__loading(this._loading)

		this.__updateMenuItem('__loading', 'color', this._loading ? 'success-alt' : 'grey-alt')
		this.__updateMenuItem('__loading', 'icon', this._loading ? 'hourglass-2' : 'hourglass-o')
	}

	public _random: boolean = environment.generate
	public async __random(): Promise<void> {
		const randomize = await this.openapi.__random()
		this._random = randomize

		this.__updateMenuItem('__random', 'color', this._random ? 'success-alt' : 'grey-alt')
	}

	private __updateMenuItem(action: string, prop: string, value: any): void {
		this.menuitems.forEach((items) => {
			items.forEach((item) => {
				if (item.action === action) {
					item[prop] = value
				}
			})
		})
	}

	@HostBinding('class')
	get __componentClass(): string {
		let base = ''
		if (this._loggedin || (this.devmode && !this._ready)) base += 'ngq_header_user-menu'
		if (this.menu) base += ' ngq_header_user-active'
		return base
	}
}
