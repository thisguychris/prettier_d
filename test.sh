#!/usr/bin/env bash
set -euo pipefail # bash "strict mode"

prettier=./bin/prettier.js
prettier_dnc=./bin/prettier_dnc.sh
file=./test/prettier.js

# Restart the server to pick up any changes
$prettier stop
$prettier start

# Grab the required info for netcat
PORT=`cat ~/.prettier_d | cut -d" " -f1`
TOKEN=`cat ~/.prettier_d | cut -d" " -f2`

# Make sure the fixture hasn't changed
md5sum $file | grep f75b2b44fd861a20b69f9a3e1960e419 >/dev/null

# Format it using netcat and make sure the output has been formatted
echo "$TOKEN $PWD $file" | nc localhost $PORT | md5sum | grep 750573a1ced7ec47055a51584e1fcd6e >/dev/null

# Pipe it to netcat and get the same output
cat $file | $prettier_dnc | md5sum | grep 750573a1ced7ec47055a51584e1fcd6e >/dev/null

# Ensure that --list-different prints the filename
($prettier --list-different $file || true) | grep $file >/dev/null

# Format the file, then make sure than --list-different doesn't fail
tmp=.write.test.js
cp $file $tmp && $prettier --write $tmp && $prettier --list-different $tmp && rm $tmp

# Ensure help message shows prettier_d and only one filename
$prettier --help | grep "Usage: prettier_d .opts. .filename.$" >/dev/null

# Ensure --fallback is in the help message
$prettier --help | grep -- "--fallback" >/dev/null

# Ensure --json is in the help message
$prettier --help | grep -- "--json" >/dev/null

# Verify that multiple files are currently not supported
echo "$TOKEN $PWD $file $file" | nc localhost $PORT | md5sum | grep 750573a1ced7ec47055a51584e1fcd6e >/dev/null
