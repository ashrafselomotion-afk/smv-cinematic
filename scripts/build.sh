#!/usr/bin/env bash
# Minify src/ -> assets/ with content hashes and rewrite the references in index.html.
set -euo pipefail; cd "$(dirname "$0")/.."
T=$(mktemp -d)
npx -y clean-css-cli@5 -O1 -o "$T/site.min.css" src/site.css
npx -y terser@5 src/site.js -c passes=2 -m --comments false -o "$T/site.min.js"
npx -y terser@5 src/theme.js -c -m --comments false -o "$T/theme.min.js"
npx -y terser@5 src/space.js --module -c passes=2 -m --comments false -o "$T/space.min.js"
h(){ shasum -a 256 "$1" | cut -c1-8; }
HC=$(h "$T/site.min.css"); HJ=$(h "$T/site.min.js"); HT=$(h "$T/theme.min.js"); HM=$(h "$T/space.min.js")
rm -f assets/site.*.min.css assets/site.*.min.js assets/theme.*.min.js assets/space.*.min.js
cp "$T/site.min.css" "assets/site.$HC.min.css"; cp "$T/site.min.js" "assets/site.$HJ.min.js"; cp "$T/theme.min.js" "assets/theme.$HT.min.js"; cp "$T/space.min.js" "assets/space.$HM.min.js"
sed -i '' -E "s#assets/site\.[0-9a-f]{8}\.min\.css#assets/site.$HC.min.css#g; s#assets/site\.[0-9a-f]{8}\.min\.js#assets/site.$HJ.min.js#g; s#assets/theme\.[0-9a-f]{8}\.min\.js#assets/theme.$HT.min.js#g; s#assets/space\.[0-9a-f]{8}\.min\.js#assets/space.$HM.min.js#g" index.html
for f in "$T/site.min.css" "$T/site.min.js" "$T/space.min.js"; do printf "%s raw=%s gz=%s\n" "$(basename $f)" "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)"; done
rm -rf "$T"
