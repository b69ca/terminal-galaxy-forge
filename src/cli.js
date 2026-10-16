#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createWorld, step, analyze, render, renderSVG, project } from './index.js';
import { parse, integer, terminal } from './terminal.js';
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: terminal-galaxy-forge [--seed N] [--width N] [--height N] [--steps N] [--frames N] [--json] [--svg FILE] [--no-color]\n\n[ / ] viewing tilt; Controls: p pause, . step, n next seed, r reset, +/- speed, q quit'); process.exit(0); }
try {
  const options = parse(args, ["--seed","--width","--height","--steps","--frames","--svg","--stars","--arms","--tilt"]);
  const live = !!(process.stdout.isTTY && process.stdin.isTTY && !options['--json'] && !options['--svg']);
  const width = integer(options, '--width', live ? Math.max(20, Math.min(100, (process.stdout.columns || 80) - 1)) : 80, 120);
  const height = integer(options, '--height', live ? Math.max(10, Math.min(40, (process.stdout.rows || 32) - 4)) : 36, 60);
  let seed = integer(options, '--seed', 42, 0xffffffff), paused = false, delay = 60;
  
  const stars = integer(options, '--stars', 1800, 5000), arms = integer(options, '--arms', 3, 6), tilt = integer(options, '--tilt', 45, 80);
  const make = () => createWorld({ seed, width, height, stars, arms, tilt }); let world = make();
  const frames = integer(options, '--frames', live ? Infinity : 1, 100000);
  if ((options['--json'] || options['--svg']) && options['--frames'] !== undefined) throw new Error('--frames is only for terminal output');
  step(world, integer(options, '--steps', live ? 0 : 0, 10000));
  if (options['--json'] || options['--svg']) {
    if (options['--svg']) await writeFile(options['--svg'], renderSVG(world));
    if (options['--json']) console.log(JSON.stringify(analyze(world), null, 2));
  } else await terminal({ live, frames, interval: () => delay,
    onKey: key => {
      if (key === 'p' || key === ' ') paused = !paused;
      else if (key === '.') { paused = true; step(world); }
      else if (key === 'n') { seed = (seed + 1) >>> 0; world = make(); }
      else if (key === 'r') world = make();
      
      else if (key === '[') world.tilt = Math.max(0, world.tilt - 5);
      else if (key === ']') world.tilt = Math.min(80, world.tilt + 5);
      else if (key === '+' || key === '=') delay = Math.max(10, Math.floor(delay / 2));
      else if (key === '-') delay = Math.min(1000, delay * 2);
    }, onTick: () => { if (paused || world.complete) return false; step(world, 1); return true; },
    draw: () => 'GALAXY FORGE | seed ' + seed + ' | frame ' + world.frame + (world.complete ? ' COMPLETE' : '') + (paused ? ' PAUSED' : '') + '\n' + render(world, { color: live && !options['--no-color'] && !process.env.NO_COLOR }) + '\n[ / ] viewing tilt | p pause . step n seed r reset q quit'
  });
} catch (error) { console.error('terminal-galaxy-forge: ' + error.message); process.exitCode = 2; }
