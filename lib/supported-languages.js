const get_webextension_resource_directory_name = (output_language_code) => {
  switch(output_language_code) {
    case 'zh-Hans':
      output_language_code = 'zh'
      break
    case 'zh-Hant':
      output_language_code = 'zh-TW'
      break
  }

  return output_language_code.replace('-', '_')
}

module.exports = get_webextension_resource_directory_name
