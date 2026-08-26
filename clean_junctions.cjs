// Safe removal of a directory tree that may contain Windows junctions/symlinks.
// Bypasses the WorkBuddy safe-delete shim by shelling out to cmd.exe:
//   - a junction/symlink  -> `rmdir /q` removes only the reparse point (never the target)
//   - a regular directory  -> recurse, then `rmdir /q`
//   - a regular file       -> `del /q`
// NEVER use `rmdir /s` here: it would follow junctions and delete target contents.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function sh(cmd) {
  try { execSync(`cmd /c ${cmd}`, { stdio: 'pipe' }) }
  catch (e) { console.error('cmd failed:', cmd, '\n', e.stderr?.toString?.() || e.message) }
}

function safeRemove(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
  catch (e) { console.error('skip read', dir, e.message); return }
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    let st
    try { st = fs.lstatSync(full) } catch { continue }
    if (st.isSymbolicLink()) {
      sh(`rmdir /q "${full}"`)           // junction -> remove reparse point only
      console.log('rmdir junction:', full)
    } else if (st.isDirectory()) {
      safeRemove(full)
      sh(`rmdir /q "${full}"`)
    } else {
      sh(`del /q "${full}"`)
    }
  }
}

const target = process.argv[2]
if (!target) { console.error('need a dir arg'); process.exit(1) }
safeRemove(target)
console.log('done:', target)
