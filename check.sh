#!/bin/sh
set -e
cd "$(dirname "$0")"
python3 build.py
python3 -c "
s=open('index.html').read();open('/tmp/claude-0/-home-claude/5f110f74-5db2-53ae-800a-3273ad626976/scratchpad/bundle.js','w').write(s[s.rindex('<script>')+8:s.rindex('</script>')])"
node --check /tmp/claude-0/-home-claude/5f110f74-5db2-53ae-800a-3273ad626976/scratchpad/bundle.js && echo SYNTAX_OK
