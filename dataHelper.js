
import lodash from 'lodash'

const _ = {
  ...lodash,
  isComplicatedArray (arr) {
    return _.isArray(arr) && _.every(arr, item => _.isArray(item) || _.isPlainObject(item))
  }
}

export const walkNodeToNet = (node, config = {}) => {
  let {prefix, mainKey, depth = 0} = config
  // 不是object／array就返回空数组
  if (!_.isComplicatedArray(node) && !_.isPlainObject(node)) {
    return []
  }

  let initialNodes = prefix ? [] : [{
    depth,
    id: 'root',
    key: 'root',
    value: node[mainKey]
  }]
  return _.reduce(node, (result, value, key) => {
    let isComplicatedArray = _.isComplicatedArray(value)
    let isSimpleArray = _.isArray(value) && !isComplicatedArray
    let isPlainObject = _.isPlainObject(value)

    let appendPrefix = _.isUndefined(prefix) ? '' : prefix + (isComplicatedArray ? '-' : '_')
    let currentNodeKey = appendPrefix + key

    // 添加本节点及父节点过来的链接
    let subNodes = [{
      id: currentNodeKey,
      key: currentNodeKey,
      depth: depth + 1,
      value: (isComplicatedArray || isPlainObject) ? key : (isSimpleArray ? JSON.stringify(value) : value)
    }]
    let subLinks = [{
      source: prefix || 'root',
      target: currentNodeKey,
      tag: (isComplicatedArray || isPlainObject) ? '' : key
    }]

    if (isComplicatedArray || isPlainObject) {
      let subResult = walkNodeToNet(value, {prefix: currentNodeKey, depth: depth + 1})
      subNodes = [...subNodes, ...subResult.nodes]
      subLinks = [...subLinks, ...subResult.links]
    }
    return {
      nodes: result.nodes.concat(subNodes),
      links: result.links.concat(subLinks)
    }
  }, {nodes: initialNodes, links: []})
}
