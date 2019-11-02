const axios = require('axios')

exports.handler = async function(event, context) {
  const URL = `https://api.esv.org/v3/passage/text/`
  const { ESV_API_AUTHORIZATION_TOKEN = "UNSET" } = process.env
  const { q } = event.queryStringParameters

  try {
    const { data } = await axios.get(URL, {
      params: { q  },
      headers: { Authorization: `Token ${ESV_API_AUTHORIZATION_TOKEN}` },
    })
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    }
  } catch (error) {
    const { status, statusText, headers, data } = error.response
    return {
      statusCode: error.response.status,
      body: JSON.stringify({ status, statusText, headers, data })
    }
  }
}
