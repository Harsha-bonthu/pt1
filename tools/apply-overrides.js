const fs = require('fs');
const path = require('path');

const overridesFile = process.argv[2] || path.join(__dirname,'overrides.json')
const dataFile = path.join(__dirname,'..','data','mock-data.json')

if(!fs.existsSync(overridesFile)){
  console.error('Overrides file not found:', overridesFile)
  console.error('Create a JSON file mapping ids to status, e.g. {"2":"active"} or pass a path as an argument.')
  process.exit(2)
}

const overrides = JSON.parse(fs.readFileSync(overridesFile,'utf8'))
const data = JSON.parse(fs.readFileSync(dataFile,'utf8'))

// backup
fs.copyFileSync(dataFile, dataFile + '.bak')

data.items = data.items.map(it => ({ ...it, status: overrides[it.id] || it.status }))

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8')
console.log('Applied overrides and wrote', dataFile)
console.log('Backup saved as', dataFile + '.bak')
