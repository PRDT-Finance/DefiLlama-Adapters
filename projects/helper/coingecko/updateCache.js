const file = './cache.json'
const cache = require(file)
const fs = require('fs')
const path = require('path')
const { fixBalancesTokens, transformTokens, } = require('../tokenMapping.js')
const { get } = require('../http.js')
const { getAssetInfo } = require('../algorand')

const chains = ['tezos', 'solana', 'algorand']

async function getCoins() {
  return get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
}

async function update() {
  const allCoins = await getCoins()
  for (const chain of chains) {
    cCache = cache[chain] || {}
    const knownAddresses = getKnownIds(chain)
    const geckoIds = getGeckoIds(chain)
    let coins = allCoins.filter(i => i.platforms[chain] && !geckoIds.has(i.id) && !knownAddresses.has(i.platforms[chain]))
    const missingIds = coins.filter(i => i.platforms[chain] === '').map(({ platforms, ...rest }) => rest)
    if (missingIds.length) {
      console.log('Missing ids')
      console.table(missingIds)
    }

    coins = coins.filter(i => i.platforms[chain] !== '')
    for (const { platforms: { [chain]: key }, id } of coins) {
      cCache[key] = { decimals: 0, coingeckoId: id }
      switch (chain) {
        case 'solana': break;
        case 'algorand':
          cCache[key].decimals = (await getAssetInfo(+key)).decimals;
          console.log('Adding algorand entry', key, cCache[key])
          break;
        case 'tezos':
        default: console.log(`${chain} Find decimals for ${key}`)
      }
    }
    cache[chain] = cCache
  }

  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(cache, null, 2))
}

function getKnownIds(chain) {
  const res = new Set()
  for (const key of Object.keys(fixBalancesTokens[chain] || {}))
    res.add(key)
  return res
}

function getGeckoIds(chain) {
  const res = new Set()
  for (const key of Object.values(fixBalancesTokens[chain] || {}).map(i => i.coingeckoId))
    res.add(key)
  return res
}


update().then(() => console.log('Done!'))