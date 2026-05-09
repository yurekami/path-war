export class MinHeap<T> {
  private heap: Array<{ key: number; value: T }> = []
  comparisons = 0

  get size(): number {
    return this.heap.length
  }

  push(key: number, value: T): void {
    this.heap.push({ key, value })
    this._bubbleUp(this.heap.length - 1)
  }

  pop(): { key: number; value: T } | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this._sinkDown(0)
    }
    return top
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      this.comparisons++
      if (this.heap[parent].key <= this.heap[i].key) break
      ;[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]]
      i = parent
    }
  }

  private _sinkDown(i: number): void {
    const n = this.heap.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n) {
        this.comparisons++
        if (this.heap[left].key < this.heap[smallest].key) smallest = left
      }
      if (right < n) {
        this.comparisons++
        if (this.heap[right].key < this.heap[smallest].key) smallest = right
      }
      if (smallest === i) break
      ;[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]]
      i = smallest
    }
  }
}
