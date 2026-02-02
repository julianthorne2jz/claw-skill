# claw-skill

Generate SKILL.md files to make CLI tools discoverable by AI agents.

## Why?

AI agents like OpenClaw discover tools via SKILL.md files. Writing them manually is tedious. This tool analyzes your package.json and source code to generate one automatically.

## Installation

```bash
npm install -g claw-skill
# or run directly
npx claw-skill .
```

## Usage

```bash
# Generate SKILL.md in current directory
claw-skill .

# Preview without writing
claw-skill . --stdout

# Overwrite existing
claw-skill . --force

# Analyze and output JSON
claw-skill . --json

# Generate for another project
claw-skill ../my-tool
```

## What It Detects

- **Name & description** from package.json
- **Commands** from switch/case patterns in code
- **Flags** from argument parsing
- **Dependencies** for context

## Example Output

```markdown
# my-tool

Do something useful with files.

## Usage

```bash
my-tool init
my-tool build
my-tool deploy
```

## Options

- `--output`
- `--verbose`
- `-f`

## When to Use

Use this tool when you need to do something useful with files.
```

## License

MIT
