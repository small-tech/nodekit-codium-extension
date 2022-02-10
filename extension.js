const path = require('path')

const { commands, ExtensionContext, Uri, workspace } = require('vscode')
const { getLanguageService } = require('vscode-html-languageservice')
const { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } = require('vscode-languageclient/node')

const { getNodeScriptVirtualContent, getSvelteVirtualContent, isInsideDataRegion } = require('./helpers')

/**
 * @type LanguageClient
 */
let client

const htmlLanguageService = getLanguageService()

/**
 * @param {ExtensionContext} context
 */
function activate(context) {
  console.log('Nodekit Activate')
  // The server is implemented in Node. It doesn’t actually do anything as we 
  // capture and redirect all language server requests in the client options
  // middleware, below, but we still need it to instantiate the client.
  const serverModule = context.asAbsolutePath('server.js')
  const debugOptions = { execArgv: ['--nolazy', '--inspect=4242'] }

  /**
   * @constant
   * @type ServerOptions
   */
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug /* mode */: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  /**
   * @contant
   * @type Map<string, string>
   */
  const virtualDocumentContents = new Map()


  workspace.registerTextDocumentContentProvider('nodekit-embedded-content', {
    provideTextDocumentContent: uri => {
      const originalUri = uri.path.slice(1).replace('.svelte', '').replace('.mjs', '')
      const decodedUri = decodeURIComponent(originalUri)
      return virtualDocumentContents.get(decodedUri)
    }
  })

  /**
   * @constant
   * @type LanguageClientOptions
   */
  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'nodescript' }],
    middleware: {
      provideCompletionItem: async (document, position, context, token, next) => {
        const originalUri = document.uri.toString()
        let contents, authority

        if (isInsideDataRegion(htmlLanguageService, document.getText(), document.offsetAt(position))) {
          contents = getNodeScriptVirtualContent(document.getText())
          authority = 'mjs'
        }	else {
          contents = getSvelteVirtualContent(document.getText())
          authority = 'svelte'
        }

        virtualDocumentContents.set(originalUri, contents)

        const virtualDocumentUriString = `nodekit-embedded-content://${authority}/${encodeURIComponent(originalUri)}.${authority}`

        console.log(virtualDocumentUriString)

        const virtualDocumentUri = Uri.parse(virtualDocumentUriString)

        return await commands.executeCommand(
          'vscode.executeCompletionItemProvider',
          virtualDocumentUri,
          position,
          context.triggerCharacter
        )
      }
    }
  };

  // Create and start language client.
  client = new LanguageClient(
    'nodekit',
    'NodeKit',
    serverOptions,
    clientOptions
  );

  // Start client (also launches server).
  client.start()
}

/**
 * @returns {(Thenable<void> | undefined)}
 */
function deactivate() {
  if (!client) {
    return undefined
  }
  return client.stop()
}

module.exports = {
  activate,
  deactivate
}
