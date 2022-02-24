#!/usr/bin/env bash

# declare variables "IBM_TRANSLATOR_API_KEY" and "IBM_TRANSLATOR_API_URL"
source "${HOME}/IBM_TRANSLATOR_API_CREDENTIALS.sh"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function translate-webextension-strings {
  node "${DIR}/../../bin/translate-webextension-strings.js" "$@"
}

input_file="${DIR}/1-input/_locales/en/messages.json"

# make-resource-dirs
output_dir="${DIR}/2-output-resource-dirs"
log_file="${output_dir}/test.log"
output_dir="${output_dir}/_locales"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-webextension-strings -i 'en' -o 'de' -o 'es' -o 'fr' -f "$input_file" -d "$output_dir" -b 'Cira' -b 'Example.com' -m >"$log_file" 2>&1

# make-flat-dir-with-debug
output_dir="${DIR}/3-output-flat-dir"
log_file="${output_dir}/test.log"

[ -d "$output_dir" ] && rm -rf "$output_dir"
mkdir -p "$output_dir"

translate-webextension-strings -i 'en' -o 'de' -o 'es' -o 'fr' -f "$input_file" -d "$output_dir" -b 'Cira' -b 'Example.com' --debug >"$log_file" 2>&1
