import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'

import { mobilePhoneNumbers, phoneNumbers, wrongMobilePhoneNumbers, wrongPhoneNumbers } from '.'

describe('libphonenumber', () => {
	it(`should be defined`, () => {
		expect(parsePhoneNumberFromString).toBeDefined()
	})

	it(`phone numbers be defined`, () => {
		expect(phoneNumbers).toBeDefined()
		// expect(Array.isArray([...phoneNumbers])).toBe(true)
	})

	it(`mobile phone numbers be defined`, () => {
		expect(mobilePhoneNumbers).toBeDefined()
		// expect(Array.isArray(mobilePhoneNumbers)).toBe(true)
	})

	// Test all valid mobile phone numbers
	// mobilePhoneNumbers.forEach((number) => {
	// 	it(`${number} should be a valid phone number`, () => {
	// 		expect(isPhoneNumber(number, 'NL')).toBe(true)
	// 	})
	// })
	// wrongMobilePhoneNumbers.forEach((number) => {
	// 	it(`${number} should be a invalid phone number`, () => {
	// 		expect(isPhoneNumber(number, 'NL')).toBe(false)
	// 	})
	// })

	// Normal numbers
	// phoneNumbers.forEach((number) => {
	// 	it(`${number} should be a valid phone number`, () => {
	// 		expect(isPhoneNumber(number, 'NL')).toBe(true)
	// 	})
	// })

	// wrongPhoneNumbers.forEach((number) => {
	// 	it(`${number} should be a invalid phone number`, () => {
	// 		expect(isPhoneNumber(number, 'NL')).toBe(false)
	// 	})
	// })

	function isPhoneNumber(input: string, local?: CountryCode): boolean {
		if (/[a-z/]+/.test(input)) return false

		const cleanInput = input.replace('-', '')
		const phoneNumber = parsePhoneNumberFromString(cleanInput, local)
		return phoneNumber ? phoneNumber.isValid() : false
	}
})
