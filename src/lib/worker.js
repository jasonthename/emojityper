
/**
 * @fileoverview Async worker.
 */

import * as promises from './promises.js';

const allowedWorkTime = 4;
const maximumTaskFrame = 100;

export default class Worker {
  constructor(fn) {
    this.fn_ = fn;
    this.queue_ = [];
    this.waiting_ = null;

    this.runner_().catch((err) => {
      console.info('worker runner failed', err);
      throw err;
    });
  }

  async runner_() {
    await new Promise((resolve) => this.waiting_ = resolve);
    this.waiting_ = null;
    await promises.idle();

    for (;;) {
      if (this.chunk_()) {
        return this.runner_();
      }
      await promises.rAF();
    }
  }

  /**
   * Completes a chunk of work.
   *
   * @return {boolean} Whether work is done.
   */
  chunk_() {
    const start = window.performance.now();

    let done = 0;
    while (this.queue_.length) {
      const next = this.queue_.shift();
      next.resolve(this.fn_(next.arg));
      ++done;

      if (done == maximumTaskFrame || window.performance.now() - start > allowedWorkTime) {
        break;
      }
    }

    return !this.queue_.length;
  }

  task(arg) {
    return new Promise((resolve) => {
      this.queue_.push({resolve, arg});
      this.waiting_ && this.waiting_();
    });
  }
}
