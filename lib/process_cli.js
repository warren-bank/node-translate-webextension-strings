const translator      = require('@warren-bank/libre-language-translator')
const DuplicatesStore = require('@warren-bank/libre-language-translator/lib/optimize-duplicates/duplicates_store')

const get_webextension_resource_directory_name = require('./supported-languages')

const path = require('path')
const fs   = require('fs')

// -----------------------------------------------------------------------------

const regex = {
  "split": {  // CRLF and LF, TAB, parameterized substitutions, named substitutions
    "all": /(?:(?:\\r)?\\n|\\t|\$\d+|\$[A-Za-z0-9_@]+\$)/g
  },
  "trim": {
    "whitespace_or_punctuation_from_start": /^(?:[\s\uFEFF\xA0]|[\x20-\x2f]|[\x3a-\x40]|[\x5b-\x60]|[\x7b-\x7e])+/g,
    "whitespace_or_punctuation_from_end":    /(?:[\s\uFEFF\xA0]|[\x20-\x2f]|[\x3a-\x40]|[\x5b-\x60]|[\x7b-\x7e])+$/g
  },
  "file_ext": /(\.[^\.]+)$/
}

let   messages_json = null  // https://developer.chrome.com/docs/extensions/mv3/i18n-messages/
const translatable  = []    // array of {jsonpath: string[], values: string[]} => where 'values' are translatable strings

// ----------------------------------------------------------------------------- helper utilities:

const split_translatable_value = function(value, separator = regex.split.all) {
  return value
    .split(separator)
    .map(chunk => chunk.replace(regex.trim.whitespace_or_punctuation_from_start, '').replace(regex.trim.whitespace_or_punctuation_from_end, ''))
    .filter(chunk => !!chunk)
}

const get_jsonpath = function(jsonpath = [], obj = {}) {
  const keys = [...jsonpath]
  let val    = obj
  let key

  while (keys.length) {
    key = keys.shift()

    // sanity check
    if (!val || !(val instanceof Object))
      return undefined

    val = val[key]
  }

  return val
}

// ----------------------------------------------------------------------------- export:

const process_cli = async function(argv_vals) {
  let messages

  try {
    messages_json = fs.readFileSync(argv_vals["--input-file"], {encoding: 'utf8'})
  }
  catch(e) {
    throw new Error('ERROR: Failed to read the input file')
  }

  try {
    messages = JSON.parse(messages_json)

    if (!messages || !(messages instanceof Object))
      throw ''
  }
  catch(e) {
    throw new Error('ERROR: Failed to parse JSON in the input file')
  }

  let translatable_value_separator = regex.split.all
  if (Array.isArray(argv_vals["--blacklist"]) && argv_vals["--blacklist"].length) {
    try {
      translatable_value_separator = new RegExp(`${regex.split.all.source.slice(0, -1)}|${argv_vals["--blacklist"].join('|')})`, 'g')
    }
    catch(e) {
      if (argv_vals["--debug"]) {
        console.log('ERROR:', 'Failed to compile substring regex patterns in blacklist!')
        console.log(`  blacklist = /(?:${argv_vals["--blacklist"].join('|')})/g`)
        throw new Error('')
      }
      else {
        throw new Error('ERROR: Failed to compile substring regex patterns in blacklist!')
      }
    }
  }

  process_input_messages(messages, translatable_value_separator)

  // cleanup
  messages = null
  translatable_value_separator = null

  const input_strings_array = get_input_strings_array()

  if (!input_strings_array.length)
    throw new Error('ERROR: Failed to extract strings from input file')

  // dedupe input strings
  const duplicates_store = new DuplicatesStore(input_strings_array)
  const deduped_input_strings_array = duplicates_store.dehydrate_input_strings_array()

  if (argv_vals["--debug"])
    fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${argv_vals["--input-language"]}.txt`), JSON.stringify(deduped_input_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

  // if no output language is specified, populate an array of all supported output languages
  if (!argv_vals["--output-language"] || !argv_vals["--output-language"].length) {
    await translator.init(argv_vals["--api-url"])

    argv_vals["--output-language"] = translator.get_output_languages(argv_vals["--api-url"], argv_vals["--input-language"])

    // if empty, throw error
    if (!argv_vals["--output-language"] || !argv_vals["--output-language"].length) {
      if (!translator.is_valid_input_language(argv_vals["--api-url"], argv_vals["--input-language"])) {
        throw new Error(
          'ERROR: Input language is not valid.' + "\n" +
          `You entered: "${argv_vals["--input-language"]}"` + "\n" +
          'Valid options: ' + JSON.stringify(translator.get_input_languages(argv_vals["--api-url"]), null, 2)
        )
      }
      else {
        throw new Error(
          'ERROR: The list of all supported output languages could not be obtained from API server.'
        )
      }
    }
  }

  // useful for debugging (ex: -i "en" -o "en" --debug)
  if ((argv_vals["--output-language"].length === 1) && (argv_vals["--output-language"][0] === argv_vals["--input-language"])) return

  for (let i=0; i < argv_vals["--output-language"].length; i++) {
    try {
      const output_language_code = argv_vals["--output-language"][i]
      const file_output          = get_output_filepath(argv_vals, output_language_code)

      if (argv_vals["--no-clobber"]) {
        if (fs.existsSync(file_output))
          continue
      }

      const deduped_translated_strings_array = await translator.translate(
        argv_vals["--api-key"],
        argv_vals["--api-url"],
        argv_vals["--input-language"],
        output_language_code,
        deduped_input_strings_array
      )

      if (argv_vals["--debug"])
        fs.writeFileSync(path.join(argv_vals["--output-directory"], `debug.${output_language_code}.txt`), JSON.stringify(deduped_translated_strings_array, null, 2), {encoding: 'utf8', flag: 'w'})

      if (deduped_translated_strings_array.length !== deduped_input_strings_array.length) {
        if (argv_vals["--debug"]) {
          console.log('ERROR:', `Number of "${output_language_code}" translated strings is incorrect!`, `Expected #${deduped_input_strings_array.length} but received #${deduped_translated_strings_array.length} from server.`, {deduped_translated_strings_array})
          throw new Error('')
        }
        else {
          throw new Error(`ERROR: Number of "${output_language_code}" translated strings is incorrect!`)
        }
      }

      const translated_strings_array = duplicates_store.rehydrate_translated_strings_array(deduped_translated_strings_array)

      if (translated_strings_array.length !== input_strings_array.length) {
        if (argv_vals["--debug"]) {
          console.log('ERROR:', `Number of "${output_language_code}" translated strings is incorrect!`, `Expected #${input_strings_array.length} but received #${translated_strings_array.length} from duplicates store.`, {translated_strings_array})
          throw new Error('')
        }
        else {
          throw new Error(`ERROR: Number of "${output_language_code}" translated strings is incorrect!`)
        }
      }

      const text_output = get_output_text_translation(translated_strings_array, output_language_code)

      if (argv_vals["--make-resource-dirs"]) {
        const resource_dir = path.dirname(file_output)

        if (!fs.existsSync(resource_dir))
          fs.mkdirSync(resource_dir)
      }

      fs.writeFileSync(file_output, text_output, {encoding: 'utf8', flag: 'w'})
    }
    catch(e) {
      if (argv_vals["--no-break-on-error"]) {
        if (e && e.message)
          console.log(e.message)

        // skip failed translation, and continue to process the remaining output languages
        continue
      }
      else {
        throw e
        break
      }
    }
  }
}

// -----------------------------------------------------------------------------

const process_input_messages = function(messages, translatable_value_separator) {
  let jsonpath

  for (const message_name in messages) {
    const message = messages[message_name]

    if (!message || !(message instanceof Object) || !message['message'])
      continue

    jsonpath = [message_name, 'message']
    process_input_messages_jsonpath(jsonpath, messages, translatable_value_separator)

    jsonpath = [message_name, 'description']
    process_input_messages_jsonpath(jsonpath, messages, translatable_value_separator)

    if (message['placeholders'] && (message['placeholders'] instanceof Object)) {
      for (const placeholder_name in message['placeholders']) {
        const placeholder = message['placeholders'][placeholder_name]

        jsonpath = [message_name, 'placeholders', placeholder_name, 'content']
        process_input_messages_jsonpath(jsonpath, messages, translatable_value_separator)

        jsonpath = [message_name, 'placeholders', placeholder_name, 'example']
        process_input_messages_jsonpath(jsonpath, messages, translatable_value_separator)
      }
    }
  }
}

const process_input_messages_jsonpath = function(jsonpath, messages, translatable_value_separator) {
  const value = get_jsonpath(jsonpath, messages)
  if (!value || (typeof value !== 'string')) return

  const values = split_translatable_value(value, translatable_value_separator)
  if (!Array.isArray(values) || !values.length) return

  translatable.push({jsonpath, values})
}

// -----------------------------------------------------------------------------

const get_input_strings_array = function() {
  const values = translatable.map(tr => tr.values)

  return [].concat(...values)
}

// -----------------------------------------------------------------------------

const get_output_text_translation = function(translations, output_language_code) {
  const messages    = JSON.parse(messages_json)
  let replace_index = 0

  for (const tr of translatable) {
    const keys = [...tr.jsonpath]
    const key  = keys.pop()
    const obj  = get_jsonpath(keys, messages)

    // sanity check
    if (!obj || !(obj instanceof Object) || (typeof obj[key] !== 'string'))
      continue

    for (const tr_val of tr.values) {
      const replace_value = translations[replace_index]
      replace_index++

      obj[key] = obj[key].replace(tr_val, replace_value)
    }
  }

  // sanity check
  if (replace_index !== translations.length) {
    throw new Error(`ERROR: Number of "${output_language_code}" replaced string translations in JSON is incorrect!`)
  }

  return JSON.stringify(messages, null, 2)
}

// -----------------------------------------------------------------------------

const get_output_filepath = function(argv_vals, output_language_code) {
  let dname, fname
  dname = ''
  fname = path.basename(argv_vals["--input-file"])

  if (argv_vals["--make-resource-dirs"]) {
    dname = get_webextension_resource_directory_name(output_language_code)
  }
  else {
    fname = regex.file_ext.test(fname)
      ? fname.replace(regex.file_ext, `.${output_language_code}$1`)
      : (fname + `.${output_language_code}.json`)
  }

  return path.join(argv_vals["--output-directory"], dname, fname)
}

// -----------------------------------------------------------------------------

module.exports = process_cli
