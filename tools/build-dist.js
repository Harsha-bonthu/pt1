const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname,'..')
const dist = path.join(root,'dist')
if(!fs.existsSync(dist)) fs.mkdirSync(dist)

console.log('Running esbuild to bundle js...')
try{
  execSync('npx esbuild js/app.js --bundle --minify --outfile=dist/app.js', { stdio:'inherit', cwd: root })
}catch(e){ console.error('esbuild failed', e); process.exit(1) }

// copy static files: index.html, css, assets, data, sw.js
const copy = (src, dest) => {
  const srcPath = path.join(root, src)
  const destPath = path.join(dist, dest || src)
  if(!fs.existsSync(srcPath)) return
  const stat = fs.statSync(srcPath)
  if(stat.isDirectory()){
    if(!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive:true })
    fs.readdirSync(srcPath).forEach(f=>{
      const nextSrc = path.join(src, f)
      const nextDest = dest ? path.join(dest, f) : path.join(src, f)
      copy(nextSrc, nextDest)
    })
  } else {
    const destDir = path.dirname(destPath)
    if(!fs.existsSync(destDir)) fs.mkdirSync(destDir,{recursive:true})
    fs.copyFileSync(srcPath, destPath)
  }
}

console.log('Copying static files...')
copy('index.html')
copy('css')
copy('assets')
copy('data')
copy('sw.js')
copy('README.md', 'README.md')

console.log('dist build complete: dist/ contains production files')
