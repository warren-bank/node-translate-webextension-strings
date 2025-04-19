### [translate-webextension-strings](https://github.com/warren-bank/node-translate-webextension-strings)

Command-line utility to use the [LibreTranslate&trade;](https://github.com/LibreTranslate/LibreTranslate) service to translate strings in WebExtensions that use the [`chrome.i18n`](https://developer.chrome.com/docs/extensions/reference/i18n/) infrastructure to implement internationalization.

#### Requirements:

* access to a server hosting the [LibreTranslate server API](https://github.com/LibreTranslate/LibreTranslate#mirrors)
  - API key
  - API URL

#### Supported Languages:

* a real-time JSON array of supported language objects is returned from the [API](https://libretranslate.com/docs) endpoint: [`/languages`](https://libretranslate.com/languages)
* [this table](https://github.com/warren-bank/node-libre-language-translator#supported-languages) summarizes its response
  - results may vary:
    * over time
    * per server
  - when the `--output-language` option is not specified:
    * a real-time list is obtained of all supported output languages for the specified input language at the specified [LibreTranslate server API](https://github.com/LibreTranslate/LibreTranslate#mirrors)

#### Installation:

```bash
npm install --global @warren-bank/translate-webextension-strings
```

#### Usage:

```bash
translate-webextension-strings <options>

options:
========
"-h"
"--help"
    Print a help message describing all command-line options.

"-v"
"--version"
    Display the version.

"-k" <key>
"--api-key" <key>
    [optional] LibreTranslate server API key.
    Fallback: Value of the "LIBRE_TRANSLATE_API_KEY" environment variable, if one exists.

"-u" <url>
"--api-url" <url>
    [optional] LibreTranslate server API URL.
    Fallback: Value of the "LIBRE_TRANSLATE_API_URL" environment variable, if one exists.
    Default: "https://libretranslate.com"

"-i" <language>
"--input-language" <language>
    [required] Language code for input file.

"-o" <language>
"--output-language" <language>
    [optional] Language code for output file.
    note: This flag can be repeated to produce multiple output files.
    note: Input language is ignored.
    Default: Produce output files for all languages.

"-f" <filepath>
"--input-file" <filepath>
    [required] File path to input 'messages.json' file.

"-d" <dirpath>
"--output-directory" <dirpath>
    [optional] Directory path to save output files.
    Default: Path to the input file's directory.

"-m"
"--make-resource-dirs"
    [optional] Make a subdirectory for each output language in output directory.
    note: If disabled, then for each output language:
          - output file is written in output directory
          - output filename extension includes language code
            (ex: '/out/messages.de.json', '/out/messages.zh-TW.json')
    note: If enabled, then for each output language:
          - an appropriately named subdirectory is created in output directory
          - output file is written in subdirectory
          - output filename is the same as the input filename
            (ex: '/out/de/messages.json', '/out/zh_TW/messages.json')
    Default: Disabled.

"-b" <substring-regex>
"--blacklist" <substring-regex>
    [optional] Do not translate substrings that match the regex pattern.
    note: This flag can be repeated to blacklist multiple substring patterns.
    Default: empty list.

"--nr"
"--no-replace"
"--no-clobber"
    [optional] Skip output languages for which the output file already exists.
    Default: Disabled. Overwrite if exists.

"--nb"
"--no-break"
"--no-break-on-error"
    [optional] When translating multiple output languages and one encounters an error,
               print a log statement and continue processing the remaining output languages.
    Default: Disabled. The library throws an error, and the command-line utility exits with code.

"--debug"
    [optional] Writes raw data files to output directory.
    note: If enabled, then for each language:
          - output file is written in output directory
          - output filename extension includes language code
            (ex: '/out/debug.en.txt', '/out/debug.de.txt', '/out/debug.zh-TW.txt')
          - file with the input language code contains the list of parsed strings
          - file with an output language code contains the list of translated strings
    Default: Disabled.
```

#### Example:

* produce translated output files for all languages and save each in a distinct resource directory
  - bash script:
    ```bash
      source ~/LIBRE_TRANSLATE_API_CREDENTIALS.sh

      translate-webextension-strings -i 'en' -f '/path/to/_locales/en/messages.json' -d '/path/to/_locales' -m
    ```
  - produces output files:
    ```text
      /path/to/_locales/ar/messages.json
      /path/to/_locales/eu/messages.json
      /path/to/_locales/bn/messages.json
      /path/to/_locales/bs/messages.json
      etc...
    ```

* produce translated output files for a specific subset of languages
  - bash script:
    ```bash
      source ~/LIBRE_TRANSLATE_API_CREDENTIALS.sh

      translate-webextension-strings -i 'en' -o 'de' -o 'es' -o 'fr' -f '/path/to/input/file.json' -d '/path/to/output'
    ```
  - produces output files:
    ```text
      /path/to/output/file.de.json
      /path/to/output/file.es.json
      /path/to/output/file.fr.json
    ```

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
