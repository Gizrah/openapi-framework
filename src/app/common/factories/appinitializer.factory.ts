import { TranslateService } from '@ngx-translate/core'

export function AppInitializerFactory(translate: TranslateService): () => Promise<any> {
	return async (): Promise<any> => {
		const lang = translate.getBrowserLang()
		translate.setDefaultLang('nl')
		if (lang !== 'nl') {
			translate.use(lang)
		}

		return Promise.resolve()
	}
}
