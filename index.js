#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const HELP = `
claw-skill — Generate SKILL.md for AI agent discoverability

USAGE
  claw-skill [path] [options]

OPTIONS
  --stdout      Print to stdout instead of writing file
  --force       Overwrite existing SKILL.md
  --json        Output analysis as JSON
  -h, --help    Show this help

EXAMPLES
  claw-skill .              Generate SKILL.md in current directory
  claw-skill ../my-tool     Generate for another project
  claw-skill . --stdout     Preview without writing
`;

function analyze(dir) {
  const pkgPath = path.join(dir, 'package.json');
  const readmePath = path.join(dir, 'README.md');
  
  if (!fs.existsSync(pkgPath)) {
    console.error('Error: No package.json found in', dir);
    process.exit(1);
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let readme = '';
  if (fs.existsSync(readmePath)) {
    readme = fs.readFileSync(readmePath, 'utf8');
  }
  
  // Extract info
  const name = pkg.name || path.basename(dir);
  const description = pkg.description || '';
  const version = pkg.version || '1.0.0';
  
  // Find binary/entry point
  let command = name;
  if (pkg.bin) {
    if (typeof pkg.bin === 'string') {
      command = name;
    } else {
      command = Object.keys(pkg.bin)[0] || name;
    }
  }
  
  // Detect main file
  const mainFile = pkg.main || 'index.js';
  const mainPath = path.join(dir, mainFile);
  let mainCode = '';
  if (fs.existsSync(mainPath)) {
    mainCode = fs.readFileSync(mainPath, 'utf8');
  }
  
  // Extract commands from code (switch/case patterns)
  const commands = [];
  const cmdMatch = mainCode.match(/case\s+['"](\w+)['"]/g);
  if (cmdMatch) {
    cmdMatch.forEach(m => {
      const cmd = m.match(/['"](\w+)['"]/)?.[1];
      if (cmd && !['default', 'help', 'version'].includes(cmd)) {
        commands.push(cmd);
      }
    });
  }
  
  // Check for flags with better filtering
  const flags = [];
  const flagPatterns = [
    // strict comparisons: === '--flag', case '--flag', .includes('--flag')
    /(?:===|==|case|includes\(|indexOf\()\s*['"`](-{1,2}[\w-]+)['"`]/g,
    // minimist/yargs style: argv.flag or opts.flag (matches 'flag' then we prepend --)
    /(?:argv|opts|flags)\.([a-zA-Z0-9_]+)/g,
  ];

  const ignoredFlags = [
    '--', '-', '-1', '---', '--help', '-h',
    '--push', '--pop', '--shift', '--unshift', '--slice', '--splice', 
    '--map', '--filter', '--reduce', '--forEach', '--find', '--join',
    '--includes', '--indexOf', '--toString', '--length', '--concat'
  ];

  flagPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(mainCode)) !== null) {
      let flag = match[1];
      
      // Handle property access style (argv.flag -> --flag)
      if (!flag.startsWith('-')) {
        if (flag.length === 1) flag = '-' + flag;
        else flag = '--' + flag;
      }

      if (flags.includes(flag)) continue;
      if (ignoredFlags.includes(flag)) continue;
      if (['--flag', '--cmd', '--opt', '--arg', '--args'].includes(flag)) continue;

      // Basic validation
      if (/^-{1,2}[a-zA-Z]/.test(flag)) {
        flags.push(flag);
      }
    }
  });
  
  // Detect dependencies
  const deps = Object.keys(pkg.dependencies || {});
  
  return {
    name,
    description,
    version,
    command,
    commands: [...new Set(commands)].slice(0, 10),
    flags: [...new Set(flags)].slice(0, 10),
    dependencies: deps,
    hasReadme: readme.length > 0
  };
}

function generateSkillMd(analysis) {
  const { name, description, command, commands, flags } = analysis;
  
  let content = `# ${name}\n\n`;
  content += `${description || 'No description provided.'}\n\n`;
  
  content += `## Usage\n\n`;
  content += `\`\`\`bash\n`;
  
  if (commands.length > 0) {
    content += `# Available commands\n`;
    commands.forEach(cmd => {
      content += `${command} ${cmd}\n`;
    });
  } else {
    content += `${command} [options]\n`;
  }
  
  content += `\`\`\`\n\n`;
  
  if (flags.length > 0) {
    content += `## Options\n\n`;
    flags.forEach(flag => {
      content += `- \`${flag}\`\n`;
    });
    content += `\n`;
  }
  
  content += `## When to Use\n\n`;
  content += `Use this tool when you need to ${description.toLowerCase() || 'perform its function'}.\n\n`;
  
  content += `## Notes\n\n`;
  content += `- Run \`${command} --help\` for full usage information\n`;
  if (analysis.dependencies.length > 0) {
    content += `- Dependencies: ${analysis.dependencies.join(', ')}\n`;
  }
  
  return content;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }
  
  const stdout = args.includes('--stdout');
  const force = args.includes('--force');
  const json = args.includes('--json');
  
  // Find target directory
  let targetDir = '.';
  for (const arg of args) {
    if (!arg.startsWith('-')) {
      targetDir = arg;
      break;
    }
  }
  
  targetDir = path.resolve(targetDir);
  
  if (!fs.existsSync(targetDir)) {
    console.error('Error: Directory not found:', targetDir);
    process.exit(1);
  }
  
  const analysis = analyze(targetDir);
  
  if (json) {
    console.log(JSON.stringify(analysis, null, 2));
    process.exit(0);
  }
  
  const content = generateSkillMd(analysis);
  
  if (stdout) {
    console.log(content);
    process.exit(0);
  }
  
  const skillPath = path.join(targetDir, 'SKILL.md');
  
  if (fs.existsSync(skillPath) && !force) {
    console.error('Error: SKILL.md already exists. Use --force to overwrite.');
    process.exit(1);
  }
  
  fs.writeFileSync(skillPath, content);
  console.log(`✓ Generated ${skillPath}`);
}

main();
