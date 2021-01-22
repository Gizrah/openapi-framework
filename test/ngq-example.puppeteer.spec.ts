describe('NGQ Example', () => {
	beforeAll(async () => {
		await page.goto('http://localhost:4200/')
	})

	it('should be titled "QuebbleFrontEnd"', async () => {
		await expect(page.title()).resolves.toMatch('QuebbleFrontEnd')
	})

	it('should be able to navigate to the "Planning" page.', async () => {
		const selector = 'a.ngq_header-link[href="/planning"]'
		const planningLink = await page.waitForSelector(selector)
		expect(planningLink).toBeTruthy()

		await page.click(selector)

		expect(page.url()).toContain('/planning')
	})
})
