export default function pmap<IN, OUT>(
  arr: IN[],
  fn: (item: IN, index: number, arr: IN[]) => Promise<OUT> | OUT,
  concurrency: number
): Promise<OUT[]>

export function pmapWorker<IN, OUT, AnyWorker extends Object>(
  arr: IN[],
  fn: (item: IN, index: number, arr: IN[], worker: AnyWorker) => Promise<OUT>,
  workers: AnyWorker[]
): Promise<OUT[]>
