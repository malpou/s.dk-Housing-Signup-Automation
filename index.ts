import puppeteer from "puppeteer-core"
import axios from "axios"

import { executablePath } from "puppeteer"

type DataPoint = {
  pk: number
  lat: number
  lon: number
}

async function script() {
  const data: DataPoint[] = await (
    await axios.get("https://mit.s.dk/studiebolig/search-result/map-data")
  ).data

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: false,
    ignoreHTTPSErrors: true,
    executablePath: executablePath(),
  })
  const page = await browser.newPage()

  await page.goto("https://mit.s.dk/studiebolig/login/")
  await page.type("#id_username", "username")
  await page.type("#id_password", "password")
  await page.click("#id_login")

  await page.waitForNavigation()

  for (const point of data) {
    try {
      await page.goto(`https://mit.s.dk/studiebolig/building/${point.pk}/`)

      const name = await page.evaluate(() => {
        return document.querySelector("body > main > form > header > h1")
          ?.textContent
      })

      const numberOfGroups = await page.evaluate(() => {
        return document.querySelectorAll("#buildingGroups > div").length
      })

      if (numberOfGroups > 0) {
        console.log(`Found a building with groups (${name})`)

        for (let i = 0; i < numberOfGroups; i++) {
          console.log("Clicking on group", i + 1)
          try {
            const heading = `#buildingGroups > .card > #heading-${
              i + 1
            } > .group-toggle-header > .group-toggle-link`
            await page.waitForSelector(heading)
            await page.click(heading)

            const button = `.card > #collapse-${i + 1} > div > #group-actions-${
              i + 1
            } > .btn`
            const buttonExists = await page.evaluate((button) => {
              return document.querySelector(button) !== null
            }, button)

            if (buttonExists) {
              await page.waitForSelector(button)
              await page.click(button)
              await page.waitForNavigation()
            }
          } catch (e) {
            continue
          }
        }
      }
    } catch (e) {
      continue
    }
  }
}

script().catch((err) => {
  console.error(err)
})
