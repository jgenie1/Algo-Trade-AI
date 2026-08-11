const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

report.forEach(fileResult => {
  if (fileResult.errorCount === 0 && fileResult.warningCount === 0) return;
  
  const entitiesErrors = fileResult.messages.filter(m => m.ruleId === 'react/no-unescaped-entities');
  if (entitiesErrors.length === 0) return;

  const filePath = fileResult.filePath;
  let fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');

  // Fix from bottom to top (or end to start of line) so offsets don't change
  // Actually, ESLint gives line and column. If we replace one character with 6 (`&apos;`), 
  // we shift subsequent columns on the SAME line.
  // So we group errors by line, and fix them from right to left (descending column).
  
  const errorsByLine = {};
  entitiesErrors.forEach(err => {
    if (!errorsByLine[err.line]) errorsByLine[err.line] = [];
    errorsByLine[err.line].push(err);
  });

  Object.keys(errorsByLine).forEach(lineStr => {
    const lineNum = parseInt(lineStr, 10);
    const errors = errorsByLine[lineNum];
    // Sort descending by column
    errors.sort((a, b) => b.column - a.column);

    let lineContent = lines[lineNum - 1];
    
    errors.forEach(err => {
      // Column is 1-indexed
      const colIdx = err.column - 1;
      
      // We only want to replace if it's an apostrophe (or double quote, but usually apostrophe)
      const char = lineContent[colIdx];
      if (char === "'") {
        lineContent = lineContent.substring(0, colIdx) + "&apos;" + lineContent.substring(colIdx + 1);
      } else if (char === '"') {
        lineContent = lineContent.substring(0, colIdx) + "&quot;" + lineContent.substring(colIdx + 1);
      }
    });

    lines[lineNum - 1] = lineContent;
  });

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Fixed entities in ${filePath}`);
});

console.log("Done fixing unescaped entities.");
