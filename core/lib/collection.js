const Find = require("./find")
const Insert = require("./insert")
const Update = require("./update")
const Replace = require("./replace")
const Delete = require("./delete")
const { clean, index_from_sort } = require("./util")

/*
 * A document collection with a standardized schema
 */
function Collection(SEA, db, name, key) {
	const col = db.get("$" + name)
	const indices = db.get("_indices").get(name)

	function find(query, options) {
		query = query || {}
		options = options || {}
		options.sort = options.sort || {}
		options.skip = options.skip || 0
		options.limit = options.limit || 0
		options.fields = options.fields || {}
		return Find(SEA, col, indices, key, query, options)
	}

	function insert(docs, options) {
		docs = docs || {}
		options = options || {}
		options.ordered = options.ordered || false
		return Insert(SEA, col, key, docs, options)
	}

	function update(query, updateDoc, options) {
		query = query || {}
		options = options || {}
		options.limit = options.limit || 0
		options.upset = options.upset || false
		return Update(SEA, col, key, query, updateDoc, options)
	}

	function replace(query, replacement, options) {
		query = query || {}
		options = options || {}
		options.upset = options.upset || false
		return Replace(SEA, col, key, query, replacement, options)
	}

	function delete_(query, options) {
		query = query || {}
		options = options || {}
		options.limit = options.limit || 0
		return Delete(SEA, col, key, query, options)
	}

	async function createIndex(sort) {
		const index = index_from_sort(sort)
		const found = await find({}, { sort }).many()

		for (let i = 0; i < found.length; i++) {
			let doc = found[i]
			const id = doc._id
			delete doc._id
			doc = { _id: id, ...clean(doc) }
			doc = await SEA.encrypt(doc, key)

			await new Promise((res, rej) => {
				indices.get(index).get(id).put(doc, ack => {
					if (ack.err) {
						rej("Failed to create index")
					} else {
						res()
					}
				})
			})
		}
	}

	function deleteIndex(sort) {
		const index = index_from_sort(sort)
		indices.get(index).put(null)
	}

	function getIndices() {
		return new Promise((res) => {
			indices.once(data => {
				if (data) {
					res(Object.keys(data).slice(1))
				} else {
					res([])
				}
			})
		})
	}

	function drop() {
		col.put(null)
	}

	return {
		find,
		insert,
		update,
		replace,
		delete: delete_,
		createIndex,
		deleteIndex,
		getIndices,
		drop,
	}
}

module.exports = Collection
