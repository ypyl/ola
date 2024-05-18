import path from 'path'
import fsPromises from 'fs/promises'

const packageJsonPath = path.resolve('./package.json')
const neuConfigPath = path.resolve('./neutralino.config.json')
const updatePath = path.resolve('./update.json')

const main = async () => {
  try {
    // Get the content of the JSON file
    const packageJsonData = await fsPromises.readFile(packageJsonPath)
    const neuConfigData = await fsPromises.readFile(neuConfigPath)
    const updateData = await fsPromises.readFile(updatePath)

    // Turn it to an object
    const packageJsonObj = JSON.parse(packageJsonData)
    const neeJsonObj = JSON.parse(neuConfigData)
    const updateObj = JSON.parse(updateData)

    // Do something with the result
    console.log(packageJsonObj.version)
    neeJsonObj.version = packageJsonObj.version
    updateObj.version = packageJsonObj.version
    await fsPromises.writeFile(neuConfigPath, JSON.stringify(neeJsonObj, null, 2));
    await fsPromises.writeFile(updatePath, JSON.stringify(updateObj, null, 2));
  } catch (err) {
    console.log(err)
  }
}

main()
