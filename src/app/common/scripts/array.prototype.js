;(function () {
	if (typeof Object.defineProperty === 'function') {
		try {
			Object.defineProperty(Array.prototype, 'sortBy', { value: sb })
			// Object.defineProperty(Array.prototype, 'indexOf', { value: proto })
		} catch (e) {}
	}
	if (!Array.prototype.sortBy) Array.prototype.sortBy = sb

	function sb(f) {
		for (var i = this.length; i; ) {
			var o = this[--i]
			this[i] = [].concat(f.call(o, o, i), o)
		}
		this.sort((a, b) => {
			for (let i = 0, len = a.length; i < len; ++i) {
				if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1 // eslint-disable-line
			}
			return 0
		})
		for (let i = this.length; i; ) {
			this[--i] = this[i][this[i].length - 1]
		}
		return this
	}
})()
