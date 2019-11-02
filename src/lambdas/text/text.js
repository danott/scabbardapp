const axios = require("axios")

exports.handler = async function(event, context) {
  const URL = `https://api.esv.org/v3/passage/text/`
  const { ESV_API_AUTHORIZATION_TOKEN } = process.env
  const clientParams = JSON.parse(event.body)

  const headers = { Authorization: `Token ${ESV_API_AUTHORIZATION_TOKEN}` }
  const params = Object.assign(
    {},
    esvParamDefaults,
    scabbardParamDefaults,
    clientParams,
  )

  try {
    const { data } = await axios.get(URL, { headers, params })
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (error) {
    const { status, statusText, headers, data } = error.response
    return {
      statusCode: error.response.status,
      body: JSON.stringify({ status, statusText, headers, data }),
    }
  }
}

const scabbardParamDefaults = {
  "include-first-verse-number": false,
  "include-footnotes": false,
  "include-heading-horizontal-lines": false,
  "include-headings": false,
  "include-passage-horizontal-lines": false,
  "include-verse-numbers": false,
}

const esvParamDefaults = {
  "horizontal-line-length": 55, // Controls the length of the line for include-passage-horizontal-lines and include-heading-horizontal-lines.
  "include-copyright": false, // Include a copyright notice at the end of the text. Mutually exclusive with include-short-copyright. This fulfills your copyright display requirements.
  "include-first-verse-numbers": true, // Include the verse number for the first verse of a chapter.
  "include-footnote-body": true, // Include footnote bodies below the text. Only works if include-footnotes is also true.
  "include-footnotes": true, // Include callouts to footnotes in the text.
  "include-heading-horizontal-lines": false, // Include a visual line of underscores (____) above each section heading.
  "include-headings": true, // Include section headings. For example, the section heading of Matthew 5 is "The Sermon on the Mount".
  "include-passage-horizontal-lines": false, // Include a line of equal signs (====) above the beginning of each passage.
  "include-passage-references": true, // Include the passage reference before the text.
  "include-selahs": true, // Include "Selah" in certain Psalms.
  "include-short-copyright": true, // Include "(ESV)" at the end of the text. Mutually exclusive with include-copyright. This fulfills your copyright display requirements.
  "include-verse-numbers": true, // Include verse numbers.
  "indent-declares": 40, // Controls how many indentation characters are used for "Declares the LORD" in some of the prophets.
  "indent-paragraphs": 2, // Controls how many indentation characters start a paragraph.
  "indent-poetry-lines": 4, // Controls how many indentation characters are used per indentation level for poetry lines.
  "indent-poetry": true, // Controls indentation of poetry lines.
  "indent-psalm-doxology": 30, // Controls how many indentation characters are used for Psalm doxologies.
  "indent-using": "space", // Controls indentation. Must be space or tab.
  "line-length": 0, // Controls how long a line can be before it is wrapped. Use 0 for unlimited line lengths.
}
