const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../packages/frontend/src');
const files = [];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walkDir(fp);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) files.push(fp);
  }
}
walkDir(srcDir);

let count = 0;
for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace static imports: from '@/xxx' → relative
  content = content.replace(/from\s+'@\/(.+?)'/g, (match, importPath) => {
    const abs = path.join(srcDir, importPath);
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      const candidate = abs + ext;
      if (fs.existsSync(candidate)) {
        let rel = path.relative(path.dirname(filePath), candidate).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        rel = rel.replace(/\.(tsx?)$/, '');
        rel = rel.replace(/\/index$/, '');
        changed = true;
        return `from '${rel}'`;
      }
    }
    console.log(`  NOT FOUND: @/${importPath} in ${path.relative(srcDir, filePath)}`);
    return match;
  });

  // Replace dynamic imports: import('@/xxx') → relative
  content = content.replace(/import\('@\/(.+?)'\)/g, (match, importPath) => {
    const abs = path.join(srcDir, importPath);
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      const candidate = abs + ext;
      if (fs.existsSync(candidate)) {
        let rel = path.relative(path.dirname(filePath), candidate).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        rel = rel.replace(/\.(tsx?)$/, '');
        rel = rel.replace(/\/index$/, '');
        changed = true;
        return `import('${rel}')`;
      }
    }
    console.log(`  NOT FOUND (dynamic): @/${importPath} in ${path.relative(srcDir, filePath)}`);
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.relative(srcDir, filePath)}`);
    count++;
  }
}

console.log(`\nDone: ${count} files updated`);
