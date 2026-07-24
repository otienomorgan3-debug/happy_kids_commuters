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

const importLine = "import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';";

const styleRegex = /(fontSize|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|width|height|borderRadius|gap)\s*:\s*(-?\d+(?:\.\d+)?)/g;

const replacements = {
  fontSize: (val) => `moderateScale(${val})`,
  padding: (val) => `scale(${val})`,
  paddingTop: (val) => `verticalScale(${val})`,
  paddingBottom: (val) => `verticalScale(${val})`,
  paddingLeft: (val) => `scale(${val})`,
  paddingRight: (val) => `scale(${val})`,
  paddingHorizontal: (val) => `scale(${val})`,
  paddingVertical: (val) => `verticalScale(${val})`,
  margin: (val) => `scale(${val})`,
  marginTop: (val) => `verticalScale(${val})`,
  marginBottom: (val) => `verticalScale(${val})`,
  marginLeft: (val) => `scale(${val})`,
  marginRight: (val) => `scale(${val})`,
  marginHorizontal: (val) => `scale(${val})`,
  marginVertical: (val) => `verticalScale(${val})`,
  width: (val) => `scale(${val})`,
  height: (val) => `verticalScale(${val})`,
  borderRadius: (val) => `moderateScale(${val})`,
  gap: (val) => `verticalScale(${val})`,
};

for (const file of files) {
  const filePath = path.join('D:\\happy_kids_commuter_system', file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("from '../../utils/responsive'")) {
    const lines = content.split('\n');
    let lastRNIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("from 'react-native'") || lines[i].includes('from "react-native"')) {
        lastRNIdx = i;
      }
    }
    if (lastRNIdx >= 0) {
      lines.splice(lastRNIdx + 1, 0, importLine);
      content = lines.join('\n');
    } else {
      content = importLine + '\n' + content;
    }
  }

  content = content.replace(styleRegex, (match, key, val) => {
    const fn = replacements[key];
    if (fn) {
      return `${key}: ${fn(val)}`;
    }
    return match;
  });

  content = content.replace(/width:\s*scale\(56\)/g, "width: SCREEN_WIDTH < 350 ? scale(48) : scale(56)");
  content = content.replace(/maxWidth:\s*'80%'/g, "maxWidth: SCREEN_WIDTH < 350 ? '85%' : '80%'");
  content = content.replace(
    /(summaryCard:\s*\{[^}]*flex:\s*1)/g,
    (match) => `${match}, minWidth: SCREEN_WIDTH < 350 ? scale(140) : scale(160)`
  );

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}

console.log('Done.');
