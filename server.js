/**
 * This is a dummy language server. We only need it to instantiate the
 * client. It should never get called as what we’re doing in the client
 * is forwarding all requests either to the default JavaScript language
 * server or to the Svelte language server from Svelte Language Tools.
 */
const { createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind } = require('vscode-languageserver/node')
const { TextDocument } = require('vscode-languageserver-textdocument')

// Create IPC connection including preview and proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

/**
 * Dummy document manager.
 * 
 * @constant
 * @type {TextDocuments<TextDocument>}
 */
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell client that server supports code completion.
      completionProvider: {
        resolveProvider: false
      }
    }
  }
})

connection.onCompletion(() => {
  console.error('onCompletion called on NodeKit language server. It should never be.')
  return null
})

documents.listen(connection)
connection.listen()
