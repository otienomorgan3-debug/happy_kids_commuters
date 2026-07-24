const fs = require('fs');
const path = require('path');

const files = [
  'parent-app/app/(parent)/payments.jsx',
  'parent-app/app/(parent)/notifications.jsx',
  'parent-app/app/(parent)/profile.jsx',
  'parent-app/app/(parent)/add-child.jsx',
  'parent-app/app/(parent)/map.jsx',
  'parent-app/app/(parent)/chat.jsx',
  'parent-app/app/(parent)/schedule-preview.jsx',
  'parent-app/app/(parent)/transport-history.jsx',
  'parent-app/app/(parent)/mark-absent.jsx',
  'parent-app/app/(parent)/change-pickup.jsx',
  'parent-app/app/(parent)/emergency-alerts.jsx',
  'parent-app/app/(driver)/students.jsx',
  'parent-app/app/(driver)/route-guidance.jsx',
  'parent-app/app/(driver)/attendance.jsx',
  'parent-app/app/(driver)/chat.jsx',
  'parent-app/app/(driver)/sos.jsx',
];

const regex = /(fontSize|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|width|height|borderRadius|gap)\s*:\s*(-?\d+(?:\.\d+)?)/g;

let missed = false;

for (const file of files) {
  const filePath = path.join('D:\\happy_kids_commuter_system', file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(regex)];
    for (const m of matches) {
      console.log(`${file}:${i + 1}: ${m[0]}`);
      missed = true;
    }
  }
}

if (!missed) {
  console.log('No hardcoded style values found.');
}
