describe('Example', () => {
	beforeAll(async () => {
		await page.goto('https://example.org/')
	})

	it('should be titled "Example Domain"', async () => {
		await expect(page.title()).resolves.toMatch('Example Domain')
	})
})
