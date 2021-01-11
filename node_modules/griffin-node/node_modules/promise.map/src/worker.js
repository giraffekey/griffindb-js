module.exports = function mapOnWorker(arr, fn, workers) {
  return new Promise(function (resolve, reject) {
    var completed = 0
    var started = 0
    var running = 0
    var results = new Array(arr.length)

    var workerIsUnsing = new WeakMap()

    var getWorker = function (index) {
      for (var i = 0; i < workers.length; i++) {
        var worker = workers[i]
        if (workerIsUnsing.get(worker)) {
          continue
        } else {
          workerIsUnsing.set(worker, index) // mark `index` is using this worker
          return worker
        }
      }
    }

    ;(function replenish() {
      if (completed >= arr.length) {
        return resolve(results)
      }

      while (running < workers.length && started < arr.length) {
        ;(function (index) {
          var cur = arr[index]
          var worker = getWorker(index)
          Promise.resolve(fn.call(cur, cur, index, arr, worker))
            .then(function (result) {
              // count down
              workerIsUnsing.delete(worker)
              running--

              // mark complete
              results[index] = result
              completed++

              replenish()
            })
            .catch(reject)
        })(started)
        started++
        running++
      }
    })()
  })
}
