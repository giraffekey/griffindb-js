# griffin

Griffin is a decentralized, offline-first, key-value based, document-oriented database built on the Sia blockchain.

## Usage

Note: None of this is implemented yet

`npm i griffindb`

`yarn add griffindb`

```js
import Griffin from "griffin-browser"

const griffin = Griffin()

const key = await griffin.gen()

const db = await griffin.namespace("my-app", key)

const dogs = db.collection("dogs")

await dogs.insert([
	{ name: "Gordon", color: "black", age: 3, owners: ["John", "Cindy"] },
	{ name: "Pooch", color: "brown", age: 5, owners: ["John", "Cindy"] },
	{ name: "Snuffles", color: "brown", age: 7, owners: ["Karen"] },
	...
]).many()

console.log(await dogs.find({ color: "brown" }).sort({ name: 1 }).one())
console.log(await dogs.find({ name: { $or: ["Gordon", "Pooch"] } }).fields({ _id: 0 }).many())
console.log(await dogs.find({ age: { $lt: 7, $gte: 3 } }).limit(10).many())

await dogs.update({ age: 5 }, { $inc: { age: 1 } }).one()
await dogs.replace({ name: "Gordon" }, { name: "Gordon Ramsey", color: "blonde", age: 54, owners: null })
```
