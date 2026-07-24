const fs = require('fs');
const path = require('path');

const files = [
  'parent-app/app/(parent)/notifications.jsx',
  'parent-app/app/(parent)/profile.jsx',
  'parent-app/app/(parent)/add-child.jsx',
  'parent-app/app/(parent)/map.jsx',
  'parent-app/app/(parent)/schedule-preview.jsx',
  'parent-app/app/(parent)/emergency-alerts.jsx',
  'parent-app/app/(driver)/students.jsx',
  'parent-app/app/(driver)/route-guidance.jsx',
  'parent-app/app/(driver)/attendance.jsx',
  'parent-app/app/(driver)/sos.jsx',
];

for (const file of files) {
  const filePath = path.join('D:\\happy_kids_commuter_system', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Count occurrences of SCREEN_WIDTH excluding the import line
  const lines = content.split('\n');
  let usageCount = 0;
  for (const line of lines) {
    if (line.includes('SCREEN_WIDTH') && !line.includes("from '../../utils/responsive'")) {
      usageCount++;
    }
  }

  if (usageCount === 0) {
    // Remove SCREEN_WIDTH from import
    content = content.replace(
      "import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';",
      "import { moderateScale, scale, verticalScale } from '../../utils/responsive';"
    );
    fs.writeFileSync(filePath, content);
    console.log(`Removed SCREEN_WIDTH from ${file}`);
  } else {
    console.log(`Kept SCREEN_WIDTH in ${file} (used ${usageCount} times)`);
  }
}

console.log('Done.');
