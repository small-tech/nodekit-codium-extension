/**
 * Helper functions for working with document regions.
 */

const { LanguageService, TokenType } = require('vscode-html-languageservice')

/**
 * Determines whether the offet is in a data region.
 * 
 * @param {LanguageService} languageService 
 * @param {string} documentText 
 * @param {number} offset 
 * @returns {boolean}
 */
function isInsideDataRegion(languageService, documentText, offset) {
  const scanner = languageService.createScanner(documentText)

  let lastTag
  let startTagCloseOffset

  let token = scanner.scan();
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.StartTag:
        lastTag = scanner.getTokenText()
        break;
      case TokenType.StartTagClose:
        startTagCloseOffset = scanner.getTokenOffset()
        break;
      case TokenType.EndTagOpen:
        if (lastTag === 'data') {
          const endTagCloseOffset = scanner.getTokenOffset()
          if (offset >= startTagCloseOffset && offset <= endTagCloseOffset) {
            return true
          }
        }
    }
    token = scanner.scan()
  }
  
  return false
}

/**
 * Returns just the <data> region.
 * 
 * Our needs are so simple, we can use regular expressions instead of the
 * parser although the parser would be more robust. Remember that there can be
 * only one <data> region in a NodeScript file.
 * 
 * @param {string} documentText 
 * @returns {string}
 */
function getNodeScriptVirtualContent(documentText) {
  const separateNodeScriptRegExp = new RegExp("^(.*?)<data>(.*?)<\/data>(.*?)$", 's')
  const groups = separateNodeScriptRegExp.exec(documentText)
  
  let content = documentText
  
  if (groups) {
    const beforeNodeScriptPlaceholder = groups[1].split('\n').map(line => {
      return ' '.repeat(line.length)
    }).join('\n')

    const nodeScript = groups[2]

    const afterNodeScriptPlaceholder = groups[3].split('\n').map(line => {
      return ' '.repeat(line.length)
    }).join('\n')

    // Note: The empty strings replace the <data> and </data> tags.
    content = beforeNodeScriptPlaceholder + '      ' + nodeScript + '       ' + afterNodeScriptPlaceholder
  }
  
  return content
}


/**
 * Returns everything but the data region (which comprises the Svelte region).
 * 
 * @param {string} documentText 
 * @returns {string}
 */
function getSvelteVirtualContent(documentText) {
  const nodeScriptRegExp = new RegExp("<data>(.*?)<\/data>", 's')
  const nodeScriptMatches = nodeScriptRegExp.exec(documentText)

  let content = documentText

  if (nodeScriptMatches) {
    // Remove the NodeScript section by replacing it with the same
    // amount of spaces while maintaining line breaks.
    // (This way, the positions of things don’t change in the
    // source code and we don’t have to do any fancy source mapping.)
    const nodeScript = nodeScriptMatches[0]
    const nodeScriptPlaceholder = nodeScript.split('\n').map(line => {
      return ' '.repeat(line.length)
    }).join('\n');

    content = documentText.replace(nodeScript, nodeScriptPlaceholder)
  }
  return content
}

module.exports = {
  isInsideDataRegion,
  getNodeScriptVirtualContent,
  getSvelteVirtualContent
}
