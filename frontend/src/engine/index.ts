/**
 * Public engine API. UI agents import ONLY from this file.
 *
 * Owner: Engine agent. Pure TypeScript — no React, no DOM, no network.
 * Every function must be deterministic for a given input so it can be unit-tested.
 */

export * from './brands'
export * from './scheduler'
export * from './safety'
export * from './score'
export * from './adherence'
export * from './refill'
