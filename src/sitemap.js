const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')
const syncCafeRegistration = require('./modals/cafeRegistration/cafeRegistration')

const sitemapFunction = async (req, res) => {
  res.header('Content-Type', 'application/xml')
  res.header('Content-Encoding', 'gzip')
  // if we have a cached entry send it
  if (req.app.locals.sitemap) {
    res.send(req.app.locals.sitemap)
    return
  }
  try {
    const smStream = new SitemapStream({
      hostname: 'https://syncremote.co/',
      lastmodDateOnly: true
    })
    const pipeline = smStream.pipe(createGzip())
    const cafeData = await syncCafeRegistration.find({ status: true })
    const lastmodDate = new Date()
    smStream.write(createObjectToWrite('/', lastmodDate))
    smStream.write(createObjectToWrite('/businessdashboard', lastmodDate))
    smStream.write(createObjectToWrite('/404', lastmodDate))
    smStream.write(createObjectToWrite('/blog', lastmodDate))
    smStream.write(createObjectToWrite('/about-us', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-listing', lastmodDate))
    smStream.write(createObjectToWrite('/map-view', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-register', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-owner', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-form', lastmodDate))
    smStream.write(createObjectToWrite('/business-profile', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-step', lastmodDate))
    smStream.write(createObjectToWrite('/cafe-register', lastmodDate))
    smStream.write(createObjectToWrite('/recommend', lastmodDate))
    smStream.write(createObjectToWrite('/user-recommend', lastmodDate))
    smStream.write(createObjectToWrite('/blog-item', lastmodDate))
    smStream.write(createObjectToWrite('/cookies', lastmodDate))
    smStream.write(createObjectToWrite('/privacy-policy', lastmodDate))
    smStream.write(createObjectToWrite('/us-notice', lastmodDate))
    smStream.write(createObjectToWrite('/terms-conditions', lastmodDate))

    const asyncFunction = async (cafeData) => {
      try {
        await Promise.all(
          cafeData.map(async (u) => {
            const fin = u._id.toString()
            const lastmodDate = new Date(u.createdAt)
            await new Promise((resolve) => {
              smStream.write(
                {
                  url: '/cafe-details/' + encodeURIComponent(fin),
                  changefreq: 'daily',
                  priority: 1,
                  lastmod: lastmodDate
                },
                () => {
                  resolve()
                }
              )
            })
          })
        )
        // Any code you want to run after all items have been processed
        console.log('All items processed successfully')
      } catch (error) {
        console.error('Error:', error)
      }
    }
    // Call the async function with your cafeData
    asyncFunction(cafeData)
    streamToPromise(pipeline).then((sm) => (req.app.locals.sitemap = sm))
    smStream.end()
    pipeline.pipe(res).on('error', (e) => {
      throw e
    })
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
}

const createObjectToWrite = (url, lastmodDate) => {
  return {
    url,
    changefreq: 'daily',
    priority: 1,
    lastmod: lastmodDate
  }
}

module.exports = sitemapFunction
