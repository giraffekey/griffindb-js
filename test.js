const Collection = require("./lib/collection")

let store = {}

const get_kv = async (key) => store[key]
const set_kv = async (key, value) => (store[key] = value)

const dogs = Collection("dogs", get_kv, set_kv)

async function main() {
  await dogs.insert([
    { name: "Gordon", color: "black", age: 3, owners: ["John", "Cindy"] },
    { name: "Pooch", color: "brown", age: 5, owners: ["John", "Cindy"] },
    { name: "Snuffles", color: "brown", age: 7, owners: ["Karen"] },
  ]).many()
  console.log(await dogs.find({ age: 5 }).one())
  // await dogs.update({ age: 5 }, { $inc: { age: 1 } }).one()
  // console.log(await dogs.find({ age: 6 }).one())
  // await dogs.replace({ name: "Gordon" }, { name: "Gordon Ramsey", color: "blonde", age: 54, owners: null })
  // console.log(await dogs.find({ name: "Gordon" }).one())
}
main()
