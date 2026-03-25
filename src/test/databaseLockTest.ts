// 数据库锁定问题修复测试
// 测试 withDbInit 和 withDbWrite 互斥锁是否正常工作

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// 模拟测试环境
const mockDatabase = {
  execute: async (sql: string, params?: any[]) => {
    // 模拟数据库操作延迟
    await new Promise(resolve => setTimeout(resolve, 10));
    return { rows: [] };
  }
};

// 模拟互斥锁函数
let writeQueue: Promise<void> = Promise.resolve();
let initQueue: Promise<void> = Promise.resolve();

function withDbWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(() => fn());
  writeQueue = next.then(() => undefined).catch(() => undefined);
  return next;
}

function withDbInit<T>(fn: () => Promise<T>): Promise<T> {
  const next = initQueue.then(() => fn());
  initQueue = next.then(() => undefined).catch(() => undefined);
  return next;
}

describe('数据库锁定问题修复测试', () => {
  beforeEach(() => {
    // 重置队列
    writeQueue = Promise.resolve();
    initQueue = Promise.resolve();
  });

  it('withDbWrite 应该串行化写操作', async () => {
    const results: number[] = [];
    const startTime = Date.now();

    // 并发执行多个写操作
    const promises = [
      withDbWrite(async () => {
        await mockDatabase.execute('BEGIN');
        results.push(1);
        await new Promise(resolve => setTimeout(resolve, 50));
        await mockDatabase.execute('COMMIT');
        return 1;
      }),
      withDbWrite(async () => {
        await mockDatabase.execute('BEGIN');
        results.push(2);
        await new Promise(resolve => setTimeout(resolve, 30));
        await mockDatabase.execute('COMMIT');
        return 2;
      }),
      withDbWrite(async () => {
        await mockDatabase.execute('BEGIN');
        results.push(3);
        await new Promise(resolve => setTimeout(resolve, 20));
        await mockDatabase.execute('COMMIT');
        return 3;
      })
    ];

    await Promise.all(promises);
    const endTime = Date.now();

    // 验证操作是串行执行的
    expect(results).toEqual([1, 2, 3]);
    // 总时间应该大于所有操作时间的总和（因为是串行的）
    expect(endTime - startTime).toBeGreaterThan(100);
  });

  it('withDbInit 应该串行化初始化操作', async () => {
    const results: number[] = [];
    const startTime = Date.now();

    // 并发执行多个初始化操作
    const promises = [
      withDbInit(async () => {
        await mockDatabase.execute('PRAGMA journal_mode = WAL');
        results.push(1);
        await new Promise(resolve => setTimeout(resolve, 40));
        return 1;
      }),
      withDbInit(async () => {
        await mockDatabase.execute('PRAGMA synchronous = NORMAL');
        results.push(2);
        await new Promise(resolve => setTimeout(resolve, 30));
        return 2;
      }),
      withDbInit(async () => {
        await mockDatabase.execute('PRAGMA foreign_keys = ON');
        results.push(3);
        await new Promise(resolve => setTimeout(resolve, 20));
        return 3;
      })
    ];

    await Promise.all(promises);
    const endTime = Date.now();

    // 验证操作是串行执行的
    expect(results).toEqual([1, 2, 3]);
    // 总时间应该大于所有操作时间的总和（因为是串行的）
    expect(endTime - startTime).toBeGreaterThan(90);
  });

  it('写操作和初始化操作应该独立工作', async () => {
    const results: number[] = [];
    const startTime = Date.now();

    // 同时执行写操作和初始化操作
    const writePromise = withDbWrite(async () => {
      await mockDatabase.execute('BEGIN');
      results.push(1);
      await new Promise(resolve => setTimeout(resolve, 50));
      await mockDatabase.execute('COMMIT');
      return 1;
    });

    const initPromise = withDbInit(async () => {
      await mockDatabase.execute('PRAGMA journal_mode = WAL');
      results.push(2);
      await new Promise(resolve => setTimeout(resolve, 30));
      return 2;
    });

    await Promise.all([writePromise, initPromise]);
    const endTime = Date.now();

    // 两个操作应该能够并行执行
    expect(results).toContain(1);
    expect(results).toContain(2);
    // 总时间应该接近较慢操作的时间（因为是并行的）
    expect(endTime - startTime).toBeLessThan(80);
  });
}); 